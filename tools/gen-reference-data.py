#!/usr/bin/env python3
"""Generates supabase/migrations/*_reference_data.sql and the matching English strings.

Usage: python3 tools/gen-reference-data.py .
"""
import json, sys
root = sys.argv[1]

areas = [  # key, lucide icon, suggested_for, hidden_for_teen
  ('career','briefcase',['working'],False),
  ('financial','piggy-bank',['standard','working'],False),
  ('investments','trending-up',['working'],True),
  ('health','heart-pulse',['standard','working','simple'],False),
  ('fitness','dumbbell',['standard','teen'],False),
  ('education','book-open',[],False),
  ('academics','graduation-cap',['teen'],False),
  ('hobbies','palette',['teen','simple'],False),
  ('social','users',[],False),
  ('logic','puzzle',[],False),
  ('analytics','chart-column',[],False),
  ('mindfulness','flower-2',[],False),
  ('family','house',['simple'],False),
]

def habit(period, times, **kw): return dict(frequency=dict(period=period, times=times), **kw)
# id, type, defaults, teen_ok, English title
templates = [
  ('career.certification','milestone',{},True,'Earn a certification'),
  ('career.promotion','milestone',{},False,'Work towards a promotion'),
  ('career.network','habit',habit('week',1),True,'Reach out to one new contact a week'),
  ('financial.emergency_fund','target',dict(quantity='currency',target_value=10000),True,'Build an emergency fund'),
  ('financial.pay_off_debt','target',dict(quantity='currency',target_value=0,direction='decrease'),False,'Pay off a debt'),
  ('financial.house_deposit','target',dict(quantity='currency',target_value=50000),False,'Save for a house deposit'),
  ('investments.invest_monthly','habit',habit('month',1,quantity='currency'),False,'Invest every month'),
  ('investments.portfolio_target','target',dict(quantity='currency',target_value=100000),False,'Reach a portfolio target'),
  ('investments.diversify','milestone',{},False,'Diversify my investments'),
  ('health.sleep_7','habit',habit('day',1,quantity='duration',unit='h',target_value=7),True,'Sleep 7 or more hours'),
  ('health.water','habit',habit('day',1,unit='glasses',target_value=8),True,'Drink 8 glasses of water'),
  ('health.checkup','yesno',{},True,'Book a health check-up'),
  ('fitness.run_5k','target',dict(quantity='distance',unit='km',target_value=5),True,'Run 5 km'),
  ('fitness.steps_10k','habit',habit('day',1,unit='steps',target_value=10000),True,'Walk 10,000 steps a day'),
  ('fitness.strength_3x','habit',habit('week',3),True,'Strength training 3 times a week'),
  ('education.finish_course','milestone',{},True,'Finish a course'),
  ('education.language','habit',habit('day',1,quantity='duration',unit='min',target_value=15),True,'Practise a new language for 15 minutes'),
  ('education.read_20','target',dict(unit='books',target_value=20),True,'Read 20 books this year'),
  ('academics.improve_grade','milestone',{},True,'Improve a grade'),
  ('academics.study_schedule','habit',habit('week',5),True,'Study 5 days a week'),
  ('academics.exam_prep','milestone',{},True,'Prepare for an exam'),
  ('hobbies.guitar','habit',habit('week',3),True,'Practise guitar 3 times a week'),
  ('hobbies.paint','habit',habit('week',1),True,'Paint once a week'),
  ('hobbies.garden','habit',habit('week',2),True,'Spend time in the garden twice a week'),
  ('social.call_friend','habit',habit('week',1),True,'Call a friend every week'),
  ('social.public_speaking','milestone',{},True,'Get comfortable speaking in public'),
  ('social.join_club','yesno',{},True,'Join a club or group'),
  ('logic.daily_puzzle','habit',habit('day',1),True,'Do a puzzle every day'),
  ('logic.chess','habit',habit('week',3),True,'Play chess 3 times a week'),
  ('logic.coding','habit',habit('week',3),True,'Do a coding exercise 3 times a week'),
  ('analytics.spreadsheets','milestone',{},True,'Learn spreadsheets'),
  ('analytics.data_course','milestone',{},True,'Complete a data course'),
  ('analytics.case_problem','habit',habit('week',1),True,'Solve one case problem a week'),
  ('mindfulness.meditate','habit',habit('day',1,quantity='duration',unit='min',target_value=10),True,'Meditate for 10 minutes'),
  ('mindfulness.journal','habit',habit('day',1),True,'Write in a journal'),
  ('mindfulness.screen_time','habit',habit('day',1,quantity='duration',unit='h',target_value=2,direction='decrease'),True,'Keep screen time under 2 hours'),
  ('family.dinners','habit',habit('week',3),True,'Family dinner 3 times a week'),
  ('family.date_night','habit',habit('month',2),False,'Date night twice a month'),
  ('family.quality_time','habit',habit('week',1),True,'Quality time with family every week'),
]

achievements = [  # key, tier, icon, criteria, title, description
  ('first_goal',1,'flag',{'type':'goals_created','count':1},'First step','You set your first goal.'),
  ('first_check_in',1,'circle-check',{'type':'check_ins','count':1},'Off you go','You logged your first check-in.'),
  ('consistent_week',1,'calendar-check',{'type':'consistency','days':7,'rate':1},'A steady week','You checked in on all 7 days of a week.'),
  ('consistent_month',2,'calendar-range',{'type':'consistency','days':30,'rate':0.8},'Rock solid','You kept 80% consistency over 30 days.'),
  ('progress_25',1,'trending-up',{'type':'goal_progress','percent':25},'A quarter of the way','You reached 25% of a goal.'),
  ('progress_50',1,'trending-up',{'type':'goal_progress','percent':50},'Halfway there','You reached 50% of a goal.'),
  ('progress_75',2,'trending-up',{'type':'goal_progress','percent':75},'Nearly there','You reached 75% of a goal.'),
  ('goal_complete',2,'trophy',{'type':'goal_progress','percent':100},'Goal reached','You completed a goal.'),
  ('reflect_4_weeks',2,'notebook-pen',{'type':'reflections','count':4},'Thoughtful','You reflected four weeks in a row.'),
  ('balanced_5_areas',3,'scale',{'type':'active_areas','count':5},'Well rounded','You made progress in five life areas in one week.'),
]

regions = [  # region, consent age, teen sharing default
  ('AU',15,False),('NZ',16,False),('US',13,False),('CA',13,False),('GB',13,False),('IE',16,False),
  ('DE',16,False),('FR',15,False),('ES',14,False),('IT',14,False),('NL',16,False),('IN',18,False),
  ('SG',13,False),('AE',18,False),('BR',13,False),('JP',13,False),
]

def q(s): return "'" + s.replace("'", "''") + "'"
def arr(xs): return "array[" + ",".join(q(x) for x in xs) + "]::public.age_mode[]" if xs else "'{}'::public.age_mode[]"
def tkey(tid): return 'template.' + tid.replace('.', '_')

out = ["-- Reference data: built-in life areas, goal templates, achievements and region rules.",
       "-- Generated by tools/gen-reference-data.py, together with the English strings in packages/i18n.",
       "-- Upserts, so the migration can be re-run safely.", ""]
out.append("insert into public.life_area_defaults (key, icon, color_token, sort_order, suggested_for, hidden_for_teen) values")
out.append(",\n".join(f"  ({q(k)}, {q(i)}, {q('area.'+k)}, {n}, {arr(s)}, {str(h).lower()})" for n,(k,i,s,h) in enumerate(areas)))
out.append("on conflict (key) do update set icon = excluded.icon, color_token = excluded.color_token, sort_order = excluded.sort_order, suggested_for = excluded.suggested_for, hidden_for_teen = excluded.hidden_for_teen;\n")
out.append("insert into public.goal_templates (id, area_key, type, title_key, defaults, sort_order, suitable_for_teen) values")
rows=[]
for n,(tid,typ,d,teen,_) in enumerate(templates):
    rows.append(f"  ({q(tid)}, {q(tid.split('.')[0])}, {q(typ)}, {q(tkey(tid))}, {q(json.dumps(d))}::jsonb, {n}, {str(teen).lower()})")
out.append(",\n".join(rows))
out.append("on conflict (id) do update set area_key = excluded.area_key, type = excluded.type, title_key = excluded.title_key, defaults = excluded.defaults, sort_order = excluded.sort_order, suitable_for_teen = excluded.suitable_for_teen;\n")
out.append("insert into public.achievements (key, tier, icon, criteria, sort_order) values")
out.append(",\n".join(f"  ({q(k)}, {t}, {q(i)}, {q(json.dumps(c))}::jsonb, {n})" for n,(k,t,i,c,_,_) in enumerate(achievements)))
out.append("on conflict (key) do update set tier = excluded.tier, icon = excluded.icon, criteria = excluded.criteria, sort_order = excluded.sort_order;\n")
out.append("-- Digital consent ages are a starting point and must be confirmed by legal review per market.")
out.append("insert into public.region_rules (region, digital_consent_age, teen_sharing_default, analytics_allowed_default) values")
out.append(",\n".join(f"  ({q(r)}, {a}, {str(t).lower()}, false)" for r,a,t in regions))
out.append("on conflict (region) do update set digital_consent_age = excluded.digital_consent_age, teen_sharing_default = excluded.teen_sharing_default, analytics_allowed_default = excluded.analytics_allowed_default;")
open(f"{root}/supabase/migrations/20261101000700_reference_data.sql","w").write("\n".join(out)+"\n")

p=f"{root}/packages/i18n/src/locales/en/common.json"
j=json.load(open(p))
j["template"]={tid.replace('.','_'):title for tid,_,_,_,title in templates}
j["achievement"]={k:{"title":t,"description":d} for k,_,_,_,t,d in achievements}
json.dump(j,open(p,"w"),indent=2,ensure_ascii=False); open(p,"a").write("\n")
print(len(templates),"templates", len(achievements), "achievements", len(regions), "regions")
