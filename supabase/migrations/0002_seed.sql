-- Seed the config tables from the v33 hardcoded prompt so the production tool
-- starts with exactly the knowledge the prototype had. Everything below is now
-- editable by admins in the app (Stammdaten / "train new receipts" tab).

-- Retailers + OCR aliases -----------------------------------------------------
insert into public.retailers (name, aliases, eligible) values
  ('REWE',      array['RENE','REWE','RW','RE/WE'],                                    true),
  ('Edeka',     array['AEZ','AE2','Aleco','A.E.Z.','EDEKA','E-Center','E Center','Nah&Gut','Nah & Gut'], true),
  ('ALDI',      array['ALDI','ALDI SÜD','ALDI NORD'],                                 true),
  ('Netto',     array['Netto','NETTO','Netto Marken-Discount'],                       true),
  ('Kaufland',  array['Kaufland','KAUFLAND','KL'],                                     true),
  ('Rossmann',  array['Rossmann','ROSSMANN','Ross'],                                  true),
  ('dm',        array['dm','DM','dm-drogerie'],                                        true),
  ('Müller',    array['Müller','MÜLLER','Mueller'],                                    true),
  ('Penny',     array['Penny','PENNY'],                                                true),
  ('Lidl',      array['Lidl','LIDL'],                                                  true),
  ('Globus',    array['Globus','GLOBUS'],                                              true),
  ('tegut',     array['tegut','TEGUT'],                                                true),
  ('Bipa',      array['Bipa','BIPA'],                                                  true),
  ('Spar',      array['Spar','SPAR'],                                                  true),
  ('Norma',     array['Norma','NORMA'],                                                true),
  ('Real',      array['Real','REAL'],                                                  true),
  ('Marktkauf', array['Marktkauf','MARKTKAUF'],                                        true),
  ('V-Markt',   array['V-Markt','Vmarkt'],                                             true)
on conflict (name) do nothing;

-- Products + OCR variant strings ---------------------------------------------
-- Netto
insert into public.products (canonical_name, retailer_id, variants)
select 'Overnight Oats Banana Split 400g', r.id,
  array['3Bea.OvernOatsBanaSpl400g','3BeaOvernOatsBanaSpl400g','3Bea.OvernOatsBanaSp1400g','3BeaOvernOatsBanaSp1400g','3Bea.OvernOatsBa1aSp1400g','3BeaOvOatsBanaSpl400g','3B.OvernOatsBanaSpl','3Bea.OvOatsBanSpl400g','3BEA.OVERNOATSBANA','3BEAOVERNOATSBANA']
from public.retailers r where r.name='Netto';
insert into public.products (canonical_name, retailer_id, variants)
select 'Overnight Oats Edle Erdbeere 400g', r.id,
  array['3BeaOvernOatsEdlErdbe400g','3Bea.OvernOatsEdlErdbe400g','3BeaOvernOatsEdIErdbe400g','3BeaOvernOatsEl1Erdbe400g','3BeaOvOatsEdlErdbe400g','3B.OvernOatsEdlErdbe','3Bea.OvOatsEdlErd400g','3BEA.OVERNOATSERDBE','3BEAOVERNOATSERDBE']
from public.retailers r where r.name='Netto';

-- Edeka
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Overnight Oats', r.id,
  array['3B.OVERNIGHT OATS','3B.OvernightOats','3Bears Overnight','3BEARS OVERNIGHT']
from public.retailers r where r.name='Edeka';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Kane''s Crunch', r.id,
  array['3B.KANE''S CRUNCH','3B.Kane''s Crunch','3B.KANES CRUNCH','3.Kane''s Crunch']
from public.retailers r where r.name='Edeka';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Kane''s Loops', r.id,
  array['3B.KANE''S LOOPS','3B.Kane''s Loops','3B.KANES LOOPS']
from public.retailers r where r.name='Edeka';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Crispy Riegel', r.id,
  array['3B.Crispy Riegel','3B.CRISPY RIEGEL','3Bears Crispy','3B.ERDNUSS-HA','3B.Erdnuss']
from public.retailers r where r.name='Edeka';

-- Müller
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Oat Bar', r.id,
  array['3BEARS OAT BAR DREI','3BEARS OAT BAR ZIMT','3BEARS OAT BAR PEAN','3BEARS OAT BAR BEER','3BEARS OAT BAR']
from public.retailers r where r.name='Müller';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears x Harry Kane', r.id,
  array['3BEARS X HARRY KANE','3Bears x Harry Kane','3BEARS HARRY KANE']
from public.retailers r where r.name='Müller';

-- Rossmann
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Overnight Oats', r.id,
  array['3BEARS OVERNIGHT O','3BEARS X SALLY OVE','3BEARS X SALLY','3BEARS X SHELLY','3BEARS OVERNIGHT']
from public.retailers r where r.name='Rossmann';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Bluey Bio', r.id,
  array['3BEARS BLUEY BIO B','3BEARS BLUEY']
from public.retailers r where r.name='Rossmann';

-- REWE
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Oat Bar', r.id,
  array['OAT BAR BEERE','OAT BAR PEANUT','OAT BAR APFEL','OAT BAR ZIMT','OAT BAR CINNAMON','OAT BAR']
from public.retailers r where r.name='REWE';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Overnight Oats', r.id,
  array['OVERNIGHT BANANA','OVERNIGHT KAKAO','OVERNIGHT HAFER','OVERNIGHT OATS','OVERNIGHT']
from public.retailers r where r.name='REWE';

-- Globus
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Oat Bar', r.id,
  array['Oat Bar Zimtiger Apf','Oat Bar Zimt','Oat Bar']
from public.retailers r where r.name='Globus';

-- Kaufland
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Porridge', r.id,
  array['3 Bears Porridge','3Bears Porridge']
from public.retailers r where r.name='Kaufland';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Proteinriegel', r.id,
  array['3Bear.Proteinrieg.','3Bear Proteinriegel','3Bears Protein']
from public.retailers r where r.name='Kaufland';

-- tegut
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Porridge', r.id,
  array['3 Bears Porridge','3Bears Porridge']
from public.retailers r where r.name='tegut';
insert into public.products (canonical_name, retailer_id, variants)
select '3Bears Bluey Knuddel', r.id,
  array['BIO Bluey Knuddel','Bluey Knuddel']
from public.retailers r where r.name='tegut';

-- General (retailer_id null) — brand-wide fuzzy strings
insert into public.products (canonical_name, retailer_id, variants) values
  ('3Bears (allgemein)', null,
   array['3Bears Porridge','3Bears Granola','3Bears Müsli','3Bears Riegel','3Bears Cereals','3Bears Haferbrei','3Bears Loops','3Bears Crispy','3Bears Kane','3Bears Oat Bar','3Bears OatBar','3Bears Overnight','3Bears Overn','3BEARS X SALLY','3BEARS X SHELLY','3Bear Protein Bar','3Bear.Proteinrieg.','3Bären','Bluey','BLUEY','BLUEY KNUSP','3Bears Bluey','3Bea.Bluey','3BeaBluey','BIO Bluey']);
