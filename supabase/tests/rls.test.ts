import { beforeAll, describe, expect, inject, it } from 'vitest';
import {
  admin,
  as,
  createCheckIn,
  createGoal,
  createUser,
  errorCode,
  FK_VIOLATION,
  RLS_VIOLATION,
  type TestUser,
} from './helpers';

describe.skipIf(!inject('dbAvailable'))('row level security', () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceGoal: { id: string; areaId: string };
  let aliceCheckIn: string;

  beforeAll(async () => {
    alice = await createUser({ display_name: 'Alice' });
    bob = await createUser({ display_name: 'Bob' });
    aliceGoal = await createGoal(alice);
    aliceCheckIn = await createCheckIn(alice, aliceGoal.id);
    await admin(
      'insert into public.milestones (goal_id, profile_id, position, title) values ($1, $2, 0, $3)',
      [aliceGoal.id, alice.profileId, 'Buy shoes'],
    );
    await admin(
      "insert into public.reminders (goal_id, profile_id, times) values ($1, $2, '{08:00}')",
      [aliceGoal.id, alice.profileId],
    );
    await admin(
      "insert into public.reflections (profile_id, week_start, went_well) values ($1, '2026-10-26', 'Walked daily')",
      [alice.profileId],
    );
  });

  describe('isolation between users', () => {
    const userTables = [
      'profiles',
      'life_areas',
      'goals',
      'milestones',
      'check_ins',
      'reminders',
      'reflections',
      'entitlements',
      'user_achievements',
    ];

    it.each(userTables)('Bob cannot read any of Alice’s rows in %s', async (table) => {
      const column = table === 'profiles' ? 'id' : 'profile_id';
      const { rows } = await as(bob, (q) =>
        q(`select 1 from public.${table} where ${column} = $1`, [alice.profileId]),
      );
      expect(rows).toHaveLength(0);
    });

    it('each user sees exactly their own profile and 13 life areas', async () => {
      const result = await as(alice, async (q) => ({
        profiles: (await q<{ id: string }>('select id from public.profiles')).rows,
        areas: (await q('select 1 from public.life_areas')).rowCount,
      }));
      expect(result.profiles.map((p) => p.id)).toEqual([alice.profileId]);
      expect(result.areas).toBe(13);
    });

    it('Bob cannot update Alice’s goal (no rows match)', async () => {
      const { rowCount } = await as(bob, (q) =>
        q("update public.goals set title = 'hacked' where id = $1", [aliceGoal.id]),
      );
      expect(rowCount).toBe(0);
      const { rows } = await admin<{ title: string }>(
        'select title from public.goals where id = $1',
        [aliceGoal.id],
      );
      expect(rows[0]!.title).toBe('Walk every day');
    });

    it('Bob cannot delete Alice’s check-in', async () => {
      const { rowCount } = await as(bob, (q) =>
        q('delete from public.check_ins where id = $1', [aliceCheckIn]),
      );
      expect(rowCount).toBe(0);
    });

    it('Bob cannot create a goal in Alice’s name', async () => {
      const code = await errorCode(
        as(bob, (q) =>
          q(
            "insert into public.goals (profile_id, area_id, type, title) values ($1, $2, 'yesno', 'x')",
            [alice.profileId, aliceGoal.areaId],
          ),
        ),
      );
      expect(code).toBe(RLS_VIOLATION);
    });

    it('Bob cannot attach his goal to Alice’s life area', async () => {
      const code = await errorCode(
        as(bob, (q) =>
          q(
            "insert into public.goals (profile_id, area_id, type, title) values ($1, $2, 'yesno', 'x')",
            [bob.profileId, aliceGoal.areaId],
          ),
        ),
      );
      expect(code).toBe(FK_VIOLATION);
    });

    it('Bob cannot log a check-in against Alice’s goal under his own name', async () => {
      const code = await errorCode(
        as(bob, (q) =>
          q(
            'insert into public.check_ins (goal_id, profile_id, local_date) values ($1, $2, current_date)',
            [aliceGoal.id, bob.profileId],
          ),
        ),
      );
      expect(code).toBe(FK_VIOLATION);
    });

    it('Bob cannot move his own goal into Alice’s account', async () => {
      const bobGoal = await createGoal(bob);
      const code = await errorCode(
        as(bob, (q) =>
          q('update public.goals set profile_id = $1 where id = $2', [alice.profileId, bobGoal.id]),
        ),
      );
      expect(code).toBe(RLS_VIOLATION);
    });
  });

  describe('own data', () => {
    it('Alice can create, update and delete her own goal and check-ins', async () => {
      await as(alice, async (q) => {
        const goal = await q<{ id: string }>(
          `insert into public.goals (profile_id, area_id, type, title, target_value, quantity, unit)
           values ($1, $2, 'target', 'Run 5 km', 5, 'distance', 'km') returning id`,
          [alice.profileId, aliceGoal.areaId],
        );
        const goalId = goal.rows[0]!.id;
        await q(
          'insert into public.check_ins (goal_id, profile_id, local_date, value) values ($1, $2, current_date, 2.5)',
          [goalId, alice.profileId],
        );
        const updated = await q("update public.goals set status = 'completed' where id = $1", [
          goalId,
        ]);
        expect(updated.rowCount).toBe(1);
        const done = await q<{ completed_at: Date | null }>(
          'select completed_at from public.goals where id = $1',
          [goalId],
        );
        expect(done.rows[0]!.completed_at).not.toBeNull();
        const deleted = await q('delete from public.goals where id = $1', [goalId]);
        expect(deleted.rowCount).toBe(1);
      });
    });

    it('a client-supplied id makes check-in retries idempotent', async () => {
      await as(alice, async (q) => {
        const id = '01890a5d-ac96-774b-bcce-b302099a8057';
        const sql = `insert into public.check_ins (id, goal_id, profile_id, local_date) values ($1, $2, $3, current_date)
                     on conflict (id) do nothing`;
        await q(sql, [id, aliceGoal.id, alice.profileId]);
        await q(sql, [id, aliceGoal.id, alice.profileId]);
        const { rowCount } = await q('select 1 from public.check_ins where id = $1', [id]);
        expect(rowCount).toBe(1);
      });
    });

    it('Alice can update her settings but not the locked profile columns', async () => {
      await as(alice, async (q) => {
        const ok = await q(
          "update public.profiles set age_mode = 'simple', theme = 'dark' where id = $1",
          [alice.profileId],
        );
        expect(ok.rowCount).toBe(1);
      });
      for (const column of ['auth_user_id', 'is_managed', 'family_group_id']) {
        const value = column === 'is_managed' ? 'true' : 'null';
        const code = await errorCode(
          as(alice, (q) =>
            q(`update public.profiles set ${column} = ${value} where id = $1`, [alice.profileId]),
          ),
        );
        expect(code, column).toBe(RLS_VIOLATION);
      }
    });

    it('nobody can create or delete profiles directly', async () => {
      expect(
        await errorCode(
          as(alice, (q) =>
            q("insert into public.profiles (display_name, is_managed) values ('x', true)"),
          ),
        ),
      ).toBe(RLS_VIOLATION);
      expect(
        await errorCode(
          as(alice, (q) => q('delete from public.profiles where id = $1', [alice.profileId])),
        ),
      ).toBe(RLS_VIOLATION);
    });

    it('clients cannot approve their own goals (server-managed column)', async () => {
      await as(alice, async (q) => {
        await q("update public.goals set approval_status = 'approved' where id = $1", [
          aliceGoal.id,
        ]);
        const { rows } = await q<{ approval_status: string }>(
          'select approval_status from public.goals where id = $1',
          [aliceGoal.id],
        );
        expect(rows[0]!.approval_status).toBe('not_required');
      });
    });

    it('users can read but never change their entitlement', async () => {
      const { rows } = await as(alice, (q) =>
        q<{ tier: string }>('select tier from public.entitlements'),
      );
      expect(rows).toEqual([{ tier: 'free' }]);
      expect(
        await errorCode(as(alice, (q) => q("update public.entitlements set tier = 'premium'"))),
      ).toBe(RLS_VIOLATION);
    });
  });

  describe('anonymous callers', () => {
    it('can read reference data', async () => {
      const result = await as(null, async (q) => ({
        areas: (await q('select 1 from public.life_area_defaults')).rowCount,
        templates: (await q('select 1 from public.goal_templates')).rowCount,
        achievements: (await q('select 1 from public.achievements')).rowCount,
        regions: (
          await q("select digital_consent_age from public.region_rules where region = 'AU'")
        ).rows,
      }));
      expect(result.areas).toBe(13);
      expect(result.templates).toBeGreaterThanOrEqual(39);
      expect(result.achievements).toBeGreaterThan(0);
      expect(result.regions).toEqual([{ digital_consent_age: 15 }]);
    });

    it.each(['profiles', 'goals', 'check_ins', 'life_areas', 'reflections'])(
      'cannot read %s at all',
      async (table) => {
        expect(await errorCode(as(null, (q) => q(`select 1 from public.${table}`)))).toBe(
          RLS_VIOLATION,
        );
      },
    );

    it('cannot call the data export', async () => {
      expect(await errorCode(as(null, (q) => q('select public.export_my_data()')))).toBe(
        RLS_VIOLATION,
      );
    });
  });

  describe('reference data is read-only for signed-in users', () => {
    it.each([
      "insert into public.goal_templates (id, area_key, type, title_key) values ('x.y', 'career', 'yesno', 'k')",
      "update public.life_area_defaults set icon = 'x'",
      'delete from public.achievements',
      'update public.region_rules set digital_consent_age = 13',
    ])('%s is denied', async (sql) => {
      expect(await errorCode(as(alice, (q) => q(sql)))).toBe(RLS_VIOLATION);
    });
  });

  describe('accountability buddies (Phase 2 hook)', () => {
    let carol: TestUser;
    let shared: { id: string };
    let privateGoal: { id: string };

    beforeAll(async () => {
      carol = await createUser();
      shared = await createGoal(alice, { title: 'Shared goal', privacy: 'shared' });
      privateGoal = await createGoal(alice, { title: 'Private goal', privacy: 'private' });
      await createCheckIn(alice, shared.id, 3);
      await admin(
        `insert into public.shares (goal_id, owner_profile_id, buddy_profile_id, accepted_at)
         values ($1, $3, $4, now()), ($2, $3, $4, now())`,
        [shared.id, privateGoal.id, alice.profileId, carol.profileId],
      );
    });

    it('an accepted buddy can read the shared goal and its check-ins', async () => {
      const result = await as(carol, async (q) => ({
        goals: (await q<{ title: string }>('select title from public.goals')).rows.map(
          (r) => r.title,
        ),
        checkIns: (await q('select 1 from public.check_ins where goal_id = $1', [shared.id]))
          .rowCount,
      }));
      expect(result.goals).toEqual(['Shared goal']);
      expect(result.checkIns).toBe(1);
    });

    it('a share does not expose a goal the owner kept private', async () => {
      const { rowCount } = await as(carol, (q) =>
        q('select 1 from public.goals where id = $1', [privateGoal.id]),
      );
      expect(rowCount).toBe(0);
    });

    it('a buddy cannot change the shared goal or log progress on it', async () => {
      await as(carol, async (q) => {
        const upd = await q("update public.goals set title = 'x' where id = $1", [shared.id]);
        expect(upd.rowCount).toBe(0);
      });
      expect(
        await errorCode(
          as(carol, (q) =>
            q(
              'insert into public.check_ins (goal_id, profile_id, local_date) values ($1, $2, current_date)',
              [shared.id, alice.profileId],
            ),
          ),
        ),
      ).toBe(RLS_VIOLATION);
    });

    it('a buddy cannot see the owner’s profile or other goals', async () => {
      const result = await as(carol, async (q) => ({
        profile: (await q('select 1 from public.profiles where id = $1', [alice.profileId]))
          .rowCount,
        others: (await q('select 1 from public.goals where id = $1', [aliceGoal.id])).rowCount,
      }));
      expect(result).toEqual({ profile: 0, others: 0 });
    });

    it('revoking the share removes access', async () => {
      await admin('update public.shares set revoked_at = now() where goal_id = $1', [shared.id]);
      const { rowCount } = await as(carol, (q) =>
        q('select 1 from public.goals where id = $1', [shared.id]),
      );
      expect(rowCount).toBe(0);
      await admin('update public.shares set revoked_at = null where goal_id = $1', [shared.id]);
    });

    it('a buddy can cheer, and the owner sees it; strangers cannot', async () => {
      const share = await admin<{ id: string }>('select id from public.shares where goal_id = $1', [
        shared.id,
      ]);
      const shareId = share.rows[0]!.id;
      await as(carol, (q) =>
        q(
          "insert into public.reactions (share_id, from_profile_id, kind) values ($1, $2, 'cheer')",
          [shareId, carol.profileId],
        ),
      );
      await admin(
        "insert into public.reactions (share_id, from_profile_id, kind) values ($1, $2, 'cheer')",
        [shareId, carol.profileId],
      );
      const seen = await as(alice, (q) =>
        q('select 1 from public.reactions where share_id = $1', [shareId]),
      );
      expect(seen.rowCount).toBe(1);
      expect(
        await errorCode(
          as(bob, (q) =>
            q(
              "insert into public.reactions (share_id, from_profile_id, kind) values ($1, $2, 'nudge')",
              [shareId, bob.profileId],
            ),
          ),
        ),
      ).toBe(RLS_VIOLATION);
    });
  });

  describe('parents and managed children (Phase 2 hook)', () => {
    let parent: TestUser;
    let childProfileId: string;
    let unmanagedMember: TestUser;

    beforeAll(async () => {
      parent = await createUser();
      unmanagedMember = await createUser();
      const family = await admin<{ id: string }>(
        "insert into public.family_groups (name) values ('The Smiths') returning id",
      );
      const familyId = family.rows[0]!.id;
      const child = await admin<{ id: string }>(
        "insert into public.profiles (display_name, is_managed, age_mode) values ('Kid', true, 'teen') returning id",
      );
      childProfileId = child.rows[0]!.id;
      await admin(
        `insert into public.family_members (group_id, profile_id, role)
         values ($1, $2, 'parent'), ($1, $3, 'child'), ($1, $4, 'child')`,
        [familyId, parent.profileId, childProfileId, unmanagedMember.profileId],
      );
      await admin(
        "insert into public.life_areas (profile_id, default_key, icon, color_token) values ($1, 'academics', 'graduation-cap', 'area.academics')",
        [childProfileId],
      );
    });

    it('a parent can read and write a managed child’s goals', async () => {
      await as(parent, async (q) => {
        const area = await q<{ id: string }>(
          'select id from public.life_areas where profile_id = $1',
          [childProfileId],
        );
        expect(area.rowCount).toBe(1);
        const ins = await q(
          "insert into public.goals (profile_id, area_id, type, title) values ($1, $2, 'yesno', 'Finish homework')",
          [childProfileId, area.rows[0]!.id],
        );
        expect(ins.rowCount).toBe(1);
      });
    });

    it('a parent cannot reach an adult family member who manages their own account', async () => {
      const { rowCount } = await as(parent, (q) =>
        q('select 1 from public.profiles where id = $1', [unmanagedMember.profileId]),
      );
      expect(rowCount).toBe(0);
    });

    it('other users cannot reach the child', async () => {
      const { rowCount } = await as(bob, (q) =>
        q('select 1 from public.life_areas where profile_id = $1', [childProfileId]),
      );
      expect(rowCount).toBe(0);
    });
  });

  describe('storage', () => {
    const upload = (user: TestUser, path: string) =>
      as(user, (q) =>
        q("insert into storage.objects (bucket_id, name, owner) values ('user-media', $1, $2)", [
          path,
          user.authId,
        ]),
      );

    it('users can upload into their own folder only', async () => {
      await expect(upload(alice, `${alice.profileId}/check-ins/photo.jpg`)).resolves.toBeDefined();
      expect(await errorCode(upload(alice, `${bob.profileId}/check-ins/photo.jpg`))).toBe(
        RLS_VIOLATION,
      );
      expect(await errorCode(upload(alice, 'not-a-uuid/photo.jpg'))).toBe(RLS_VIOLATION);
      expect(await errorCode(upload(alice, 'photo.jpg'))).toBe(RLS_VIOLATION);
    });

    it('users cannot list or read another user’s files', async () => {
      await admin("insert into storage.objects (bucket_id, name) values ('user-media', $1)", [
        `${alice.profileId}/avatar.png`,
      ]);
      const { rowCount } = await as(bob, (q) => q('select 1 from storage.objects'));
      expect(rowCount).toBe(0);
    });
  });

  describe('data export', () => {
    it('returns only the caller’s own data', async () => {
      const { rows } = await as(alice, (q) =>
        q<{ data: Record<string, unknown[] | Record<string, unknown>> }>(
          'select public.export_my_data() as data',
        ),
      );
      const data = rows[0]!.data;
      const profile = data.profile as Record<string, unknown>;
      expect(profile.id).toBe(alice.profileId);
      expect(profile).not.toHaveProperty('auth_user_id');
      const goals = data.goals as { profile_id: string }[];
      expect(goals.length).toBeGreaterThan(0);
      expect(goals.every((g) => g.profile_id === alice.profileId)).toBe(true);
      expect((data.check_ins as unknown[]).length).toBeGreaterThan(0);
      expect(data.life_areas as unknown[]).toHaveLength(13);
    });

    it('returns nothing of Alice’s to Bob', async () => {
      const { rows } = await as(bob, (q) =>
        q<{ data: { goals: { profile_id: string }[]; check_ins: unknown[] } }>(
          'select public.export_my_data() as data',
        ),
      );
      expect(rows[0]!.data.goals.every((g) => g.profile_id === bob.profileId)).toBe(true);
      expect(rows[0]!.data.check_ins).toEqual([]);
    });
  });

  describe('account deletion', () => {
    it('deleting the auth user removes every row they own', async () => {
      const dave = await createUser();
      const goal = await createGoal(dave);
      await createCheckIn(dave, goal.id);
      await admin('delete from auth.users where id = $1', [dave.authId]);
      const tables = ['profiles', 'life_areas', 'goals', 'check_ins', 'entitlements'];
      for (const table of tables) {
        const column = table === 'profiles' ? 'id' : 'profile_id';
        const { rowCount } = await admin(`select 1 from public.${table} where ${column} = $1`, [
          dave.profileId,
        ]);
        expect(rowCount, table).toBe(0);
      }
    });
  });
});
