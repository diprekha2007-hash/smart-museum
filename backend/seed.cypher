// backend/seed.cypher
// Idempotent seed data for SmartMuseum Neo4j database
// Uses MERGE so that it NEVER deletes or duplicates existing data.

// Constraints
CREATE CONSTRAINT visitor_id_unique IF NOT EXISTS FOR (n:Visitor) REQUIRE n.Visitor_ID IS UNIQUE;
CREATE CONSTRAINT rfid_card_id_unique IF NOT EXISTS FOR (n:RFID_CARD) REQUIRE n.Card_ID IS UNIQUE;
CREATE CONSTRAINT ticket_id_unique IF NOT EXISTS FOR (n:Ticket) REQUIRE n.Ticket_ID IS UNIQUE;
CREATE CONSTRAINT visit_id_unique IF NOT EXISTS FOR (n:Visit) REQUIRE n.Visit_ID IS UNIQUE;
CREATE CONSTRAINT gallery_id_unique IF NOT EXISTS FOR (n:Gallery) REQUIRE n.Gallery_ID IS UNIQUE;
CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS FOR (n:Artifact) REQUIRE n.Artifact_ID IS UNIQUE;
CREATE CONSTRAINT artifact_type_id_unique IF NOT EXISTS FOR (n:ARTIFACT_TYPE) REQUIRE n.Artifact_Type_ID IS UNIQUE;
CREATE CONSTRAINT exhibition_id_unique IF NOT EXISTS FOR (n:Exhibition) REQUIRE n.Exhibition_ID IS UNIQUE;
CREATE CONSTRAINT kiosk_id_unique IF NOT EXISTS FOR (n:Kiosk) REQUIRE n.Kiosk_ID IS UNIQUE;
CREATE CONSTRAINT feedback_id_unique IF NOT EXISTS FOR (n:Feedback) REQUIRE n.Feedback_ID IS UNIQUE;
CREATE CONSTRAINT preference_id_unique IF NOT EXISTS FOR (n:Preference) REQUIRE n.Preference_ID IS UNIQUE;
CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (n:Event) REQUIRE n.Event_ID IS UNIQUE;
CREATE CONSTRAINT staff_id_unique IF NOT EXISTS FOR (n:Staff) REQUIRE n.Staff_ID IS UNIQUE;
CREATE CONSTRAINT conservation_id_unique IF NOT EXISTS FOR (n:Conservation) REQUIRE n.Conservation_ID IS UNIQUE;

// Artifact Types
MERGE (t1:ARTIFACT_TYPE {Artifact_Type_ID:'AT001'}) SET t1.Type_Name='Pottery', t1.Description='Historic ceramic and clay objects';
MERGE (t2:ARTIFACT_TYPE {Artifact_Type_ID:'AT002'}) SET t2.Type_Name='Sculptures', t2.Description='Carved stone and bronze three-dimensional works';
MERGE (t3:ARTIFACT_TYPE {Artifact_Type_ID:'AT003'}) SET t3.Type_Name='Paintings', t3.Description='Traditional miniature and heritage paintings';
MERGE (t4:ARTIFACT_TYPE {Artifact_Type_ID:'AT004'}) SET t4.Type_Name='Historical Artifacts', t4.Description='Ancient tools, weapons, and ceremonial objects';
MERGE (t5:ARTIFACT_TYPE {Artifact_Type_ID:'AT005'}) SET t5.Type_Name='Manuscripts', t5.Description='Historic palm leaf and paper manuscripts';
MERGE (t6:ARTIFACT_TYPE {Artifact_Type_ID:'AT006'}) SET t6.Type_Name='Fossils', t6.Description='Prehistoric fossil specimens and natural history relics';

// Galleries (Tagged with both Gallery and GALLERY)
MERGE (g1:Gallery:GALLERY {Gallery_ID:'G001'}) SET g1.Gallery_Name='Ancient Civilizations', g1.Floor='Ground Floor', g1.Location='East Wing', g1.Capacity=80, g1.Description='Artifacts and daily life objects from early river civilizations.';
MERGE (g2:Gallery:GALLERY {Gallery_ID:'G002'}) SET g2.Gallery_Name='Sculpture Gallery', g2.Floor='First Floor', g2.Location='West Wing', g2.Capacity=60, g2.Description='Historic stone and bronze masterpieces across dynasties.';
MERGE (g3:Gallery:GALLERY {Gallery_ID:'G003'}) SET g3.Gallery_Name='Indian Painting Gallery', g3.Floor='Second Floor', g3.Location='North Wing', g3.Capacity=50, g3.Description='Exquisite Rajasthani, Mughal and folk miniature paintings.';
MERGE (g4:Gallery:GALLERY {Gallery_ID:'G004'}) SET g4.Gallery_Name='Textile Heritage', g4.Floor='Ground Floor', g4.Location='South Wing', g4.Capacity=45, g4.Description='Handloom weaves, royal garments and ancient dyeing traditions.';
MERGE (g5:Gallery:GALLERY {Gallery_ID:'G005'}) SET g5.Gallery_Name='Archaeology Hall', g5.Floor='Ground Floor', g5.Location='Central Atrium', g5.Capacity=100, g5.Description='Excavated finds, tools, fossils and terracotta treasures.';
MERGE (g6:Gallery:GALLERY {Gallery_ID:'G006'}) SET g6.Gallery_Name='Coins & Numismatics', g6.Floor='First Floor', g6.Location='East Wing', g6.Capacity=40, g6.Description='Historic coins, royal seals and currency from antiquity.';
MERGE (g7:Gallery:GALLERY {Gallery_ID:'G007'}) SET g7.Gallery_Name='Bronze Masterpieces', g7.Floor='First Floor', g7.Location='South Wing', g7.Capacity=55, g7.Description='Lost-wax cast bronzes showcasing spiritual and courtly artistry.';
MERGE (g8:Gallery:GALLERY {Gallery_ID:'G008'}) SET g8.Gallery_Name='Folk Art & Lore', g8.Floor='Second Floor', g8.Location='West Wing', g8.Capacity=50, g8.Description='Indigenous ceremonial masks, wooden craft and tribal lore.';
MERGE (g9:Gallery:GALLERY {Gallery_ID:'G009'}) SET g9.Gallery_Name='Manuscript Archive', g9.Floor='Second Floor', g9.Location='East Wing', g9.Capacity=35, g9.Description='Rare palm leaf scrolls and classical scholarly treatises.';
MERGE (g10:Gallery:GALLERY {Gallery_ID:'G010'}) SET g10.Gallery_Name='Cultural Heritage', g10.Floor='Third Floor', g10.Location='Rotunda', g10.Capacity=90, g10.Description='A panoramic celebration of shared heritage and timeless crafts.';

// Artifacts (Tagged with both Artifact and ARTIFACT)
MERGE (a1:Artifact:ARTIFACT {Artifact_ID:'A001'}) SET a1.Title='Painted Terracotta Pot', a1.Category='Pottery', a1.Description='Decorated terracotta vessel with geometric slip patterns', a1.Historical_Information='Used for domestic grain and water storage during the mature Harappan period.', a1.Origin='South India', a1.Period='Ancient (c. 1800 BCE)', a1.Acquisition_Date='2020-03-10', a1.Current_Status='On Display';
MERGE (a2:Artifact:ARTIFACT {Artifact_ID:'A002'}) SET a2.Title='Bronze Dancing Figure', a2.Category='Sculptures', a2.Description='Expressive bronze figurine demonstrating early lost-wax casting', a2.Historical_Information='Illustrates traditional metal casting techniques and courtly performing arts.', a2.Origin='Tamil Nadu', a2.Period='Medieval (c. 11th Century CE)', a2.Acquisition_Date='2019-07-21', a2.Current_Status='On Display';
MERGE (a3:Artifact:ARTIFACT {Artifact_ID:'A003'}) SET a3.Title='Chola Bronze Nataraja', a3.Category='Sculptures', a3.Description='Cosmic dancer Shiva encircled by a halo of primordial flame', a3.Historical_Information='Masterwork of Chola metallurgy symbolizing creation, preservation and transformation.', a3.Origin='Thanjavur, Tamil Nadu', a3.Period='Chola Dynasty (c. 10th Century CE)', a3.Acquisition_Date='2018-05-14', a3.Current_Status='On Display';
MERGE (a4:Artifact:ARTIFACT {Artifact_ID:'A004'}) SET a4.Title='Prehistoric Ammonite Fossil', a4.Category='Fossils', a4.Description='Spiraled cephalopod fossil shell with preserved suture patterns', a4.Historical_Information='Discovered in Jurassic sedimentary strata of the Spiti Valley, dating back 150 million years.', a4.Origin='Spiti Valley, Himachal', a4.Period='Jurassic Era (c. 150 Mya)', a4.Acquisition_Date='2021-11-05', a4.Current_Status='On Display';
MERGE (a5:Artifact:ARTIFACT {Artifact_ID:'A005'}) SET a5.Title='Rajasthani Court Miniature Painting', a5.Category='Paintings', a5.Description='Delicate gouache and gold leaf depiction of royal courtly assembly', a5.Historical_Information='Painted using mineral pigments and squirrel-hair brushes in the Mewar court school.', a5.Origin='Mewar, Rajasthan', a5.Period='Late Medieval (c. 1720 CE)', a5.Acquisition_Date='2017-09-19', a5.Current_Status='On Display';
MERGE (a6:Artifact:ARTIFACT {Artifact_ID:'A006'}) SET a6.Title='Punch-Marked Silver Karshapana Coin', a6.Category='Historical Artifacts', a6.Description='Irregular silver coin stamped with sun and six-arm symbols', a6.Historical_Information='Issued as standard trade currency across the Mauryan Empire under Emperor Ashoka.', a6.Origin='Magadha, Bihar', a6.Period='Mauryan Empire (c. 3rd Century BCE)', a6.Acquisition_Date='2016-01-30', a6.Current_Status='On Display';
MERGE (a7:Artifact:ARTIFACT {Artifact_ID:'A007'}) SET a7.Title='Gandhara Stone Buddha Relief', a7.Category='Sculptures', a7.Description='Gray schist carved relief showing Greco-Buddhist meditative posture', a7.Historical_Information='Demonstrates the unique synthesis of Hellenistic classical form with Indian Buddhist thought.', a7.Origin='Gandhara Region', a7.Period='Kushan Dynasty (c. 2nd Century CE)', a7.Acquisition_Date='2015-12-08', a7.Current_Status='On Display';
MERGE (a8:Artifact:ARTIFACT {Artifact_ID:'A008'}) SET a8.Title='Zari Brocade Royal Patola Textile', a8.Category='Historical Artifacts', a8.Description='Double-ikat silk textile interwoven with pure gold thread motifs', a8.Historical_Information='Worn by royal nobility during auspicious ceremonies; took over six months to hand-weave.', a8.Origin='Patan, Gujarat', a8.Period='Medieval (c. 16th Century CE)', a8.Acquisition_Date='2022-04-18', a8.Current_Status='On Display';
MERGE (a9:Artifact:ARTIFACT {Artifact_ID:'A009'}) SET a9.Title='Bhuta Ritual Wooden Spirit Mask', a9.Category='Historical Artifacts', a9.Description='Carved polychrome jackwood ceremonial mask used in spirit worship', a9.Historical_Information='Worn during annual ritual invocations to protect communities and agricultural prosperity.', a9.Origin='Coastal Karnataka', a9.Period='Pre-Modern (c. 1850 CE)', a9.Acquisition_Date='2020-08-27', a9.Current_Status='On Display';
MERGE (a10:Artifact:ARTIFACT {Artifact_ID:'A010'}) SET a10.Title='Deepalakshmi Temple Brass Oil Lamp', a10.Category='Historical Artifacts', a10.Description='Intricately cast brass lamp held by standing goddess of wealth', a10.Historical_Information='Dedicated to temple sanctums to sustain sacred eternal flames during evening aarti.', a10.Origin='Kerala', a10.Period='Medieval (c. 15th Century CE)', a10.Acquisition_Date='2019-02-11', a10.Current_Status='On Display';
MERGE (a11:Artifact:ARTIFACT {Artifact_ID:'A011'}) SET a11.Title='Inscribed Sanskrit Palm Leaf Manuscript', a11.Category='Manuscripts', a11.Description='Dried and polished Borassus flabellifer leaves inscribed in Grantha script', a11.Historical_Information='Preserves rare astronomical calculations, medicinal plant treatises and epic verses.', a11.Origin='Thanjavur, Tamil Nadu', a11.Period='Medieval (c. 13th Century CE)', a11.Acquisition_Date='2014-06-22', a11.Current_Status='On Display';
MERGE (a12:Artifact:ARTIFACT {Artifact_ID:'A012'}) SET a12.Title='Jaipur Cobalt Blue Pottery Floral Urn', a12.Category='Pottery', a12.Description='Egyptian paste glazed decorative urn with Persian floral tracery', a12.Historical_Information='Developed under royal Jaipur patronage combining quartz powder with natural cobalt and copper oxides.', a12.Origin='Jaipur, Rajasthan', a12.Period='19th Century CE', a12.Acquisition_Date='2023-01-15', a12.Current_Status='On Display';

// Gallery -> CONTAINS -> Artifact & CONTAINS_ARTIFACT
MERGE (g1)-[:CONTAINS]->(a1);
MERGE (g1)-[:CONTAINS_ARTIFACT]->(a1);
MERGE (g1)-[:CONTAINS]->(a6);
MERGE (g1)-[:CONTAINS_ARTIFACT]->(a6);
MERGE (g2)-[:CONTAINS]->(a2);
MERGE (g2)-[:CONTAINS_ARTIFACT]->(a2);
MERGE (g2)-[:CONTAINS]->(a7);
MERGE (g2)-[:CONTAINS_ARTIFACT]->(a7);
MERGE (g3)-[:CONTAINS]->(a5);
MERGE (g3)-[:CONTAINS_ARTIFACT]->(a5);
MERGE (g4)-[:CONTAINS]->(a8);
MERGE (g4)-[:CONTAINS_ARTIFACT]->(a8);
MERGE (g5)-[:CONTAINS]->(a4);
MERGE (g5)-[:CONTAINS_ARTIFACT]->(a4);
MERGE (g6)-[:CONTAINS]->(a6);
MERGE (g6)-[:CONTAINS_ARTIFACT]->(a6);
MERGE (g7)-[:CONTAINS]->(a3);
MERGE (g7)-[:CONTAINS_ARTIFACT]->(a3);
MERGE (g8)-[:CONTAINS]->(a9);
MERGE (g8)-[:CONTAINS_ARTIFACT]->(a9);
MERGE (g9)-[:CONTAINS]->(a11);
MERGE (g9)-[:CONTAINS_ARTIFACT]->(a11);
MERGE (g10)-[:CONTAINS]->(a10);
MERGE (g10)-[:CONTAINS_ARTIFACT]->(a10);
MERGE (g10)-[:CONTAINS]->(a12);
MERGE (g10)-[:CONTAINS_ARTIFACT]->(a12);

// Artifact -> CLASSIFIED_AS -> Type
MERGE (a1)-[:CLASSIFIED_AS]->(t1);
MERGE (a2)-[:CLASSIFIED_AS]->(t2);
MERGE (a3)-[:CLASSIFIED_AS]->(t2);
MERGE (a4)-[:CLASSIFIED_AS]->(t6);
MERGE (a5)-[:CLASSIFIED_AS]->(t3);
MERGE (a6)-[:CLASSIFIED_AS]->(t4);
MERGE (a7)-[:CLASSIFIED_AS]->(t2);
MERGE (a8)-[:CLASSIFIED_AS]->(t4);
MERGE (a9)-[:CLASSIFIED_AS]->(t4);
MERGE (a10)-[:CLASSIFIED_AS]->(t4);
MERGE (a11)-[:CLASSIFIED_AS]->(t5);
MERGE (a12)-[:CLASSIFIED_AS]->(t1);

// Exhibitions (Tagged with Exhibition and EXHIBITION)
MERGE (ex1:Exhibition:EXHIBITION {Exhibition_ID:'EX001'}) SET ex1.Exhibition_Name='Stories in Clay and Bronze', ex1.Theme='Everyday life and artistic metallurgy', ex1.Start_Date='2026-10-01', ex1.End_Date='2026-12-31', ex1.Description='Selected objects showing how ancient artisans shaped civilization through clay and molten metal.', ex1.Venue='Main Central Wing';
MERGE (ex2:Exhibition:EXHIBITION {Exhibition_ID:'EX002'}) SET ex2.Exhibition_Name='Echoes of the Indus', ex2.Theme='Urban life and ancient trade', ex2.Start_Date='2026-11-01', ex2.End_Date='2027-01-31', ex2.Description='Unearthing urban design, terracotta crafts, seals and weight systems of the bronze age.', ex2.Venue='Archaeology Pavilion';
MERGE (ex3:Exhibition:EXHIBITION {Exhibition_ID:'EX003'}) SET ex3.Exhibition_Name='Art Across Dynasties', ex3.Theme='Royal patronage and classical form', ex3.Start_Date='2026-09-15', ex3.End_Date='2026-11-30', ex3.Description='Tracing religious and courtly expression through stone, sculpture and royal miniature paintings.', ex3.Venue='North Grand Gallery';
MERGE (ex4:Exhibition:EXHIBITION {Exhibition_ID:'EX004'}) SET ex4.Exhibition_Name='Sacred Threads & Royal Weaves', ex4.Theme='Textile craftsmanship & gold zari', ex4.Start_Date='2026-10-15', ex4.End_Date='2026-12-15', ex4.Description='An immersive journey into royal handlooms, natural dyes, and heirloom ceremonial textiles.', ex4.Venue='Textile Pavilion';
MERGE (ex5:Exhibition:EXHIBITION {Exhibition_ID:'EX005'}) SET ex5.Exhibition_Name='Divine Bronze & Sacred Dance', ex5.Theme='Spiritual symbolism in metallurgy', ex5.Start_Date='2026-10-20', ex5.End_Date='2027-02-28', ex5.Description='Celebrating the cosmic rhythm of Nataraja and temple iconography.', ex5.Venue='South Bronze Hall';
MERGE (ex6:Exhibition:EXHIBITION {Exhibition_ID:'EX006'}) SET ex6.Exhibition_Name='Living Cultural Heritage of India', ex6.Theme='Folk traditions and sacred manuscripts', ex6.Start_Date='2026-08-01', ex6.End_Date='2026-12-31', ex6.Description='Connecting tribal lore, ceremonial masks, and ancient palm-leaf wisdom.', ex6.Venue='Rotunda Heritage Hall';

// Exhibition -> FEATURES -> Artifact
MERGE (ex1)-[:FEATURES]->(a1);
MERGE (ex1)-[:FEATURES_ARTIFACT]->(a1);
MERGE (ex1)-[:FEATURES]->(a2);
MERGE (ex1)-[:FEATURES_ARTIFACT]->(a2);
MERGE (ex2)-[:FEATURES]->(a1);
MERGE (ex2)-[:FEATURES_ARTIFACT]->(a1);
MERGE (ex2)-[:FEATURES]->(a6);
MERGE (ex2)-[:FEATURES_ARTIFACT]->(a6);
MERGE (ex3)-[:FEATURES]->(a5);
MERGE (ex3)-[:FEATURES_ARTIFACT]->(a5);
MERGE (ex3)-[:FEATURES]->(a7);
MERGE (ex3)-[:FEATURES_ARTIFACT]->(a7);
MERGE (ex4)-[:FEATURES]->(a8);
MERGE (ex4)-[:FEATURES_ARTIFACT]->(a8);
MERGE (ex5)-[:FEATURES]->(a3);
MERGE (ex5)-[:FEATURES_ARTIFACT]->(a3);
MERGE (ex5)-[:FEATURES]->(a2);
MERGE (ex5)-[:FEATURES_ARTIFACT]->(a2);
MERGE (ex6)-[:FEATURES]->(a9);
MERGE (ex6)-[:FEATURES_ARTIFACT]->(a9);
MERGE (ex6)-[:FEATURES]->(a11);
MERGE (ex6)-[:FEATURES_ARTIFACT]->(a11);
MERGE (ex6)-[:FEATURES]->(a12);
MERGE (ex6)-[:FEATURES_ARTIFACT]->(a12);

// Events (Tagged with Event and EVENT)
MERGE (ev1:Event:EVENT {Event_ID:'EV001'}) SET ev1.Event_Name='Museum Heritage Walk', ev1.Event_Date='2026-11-05', ev1.Start_Time='10:00', ev1.End_Time='11:30', ev1.Venue='Main Central Wing', ev1.Description='Curator-led guided walking tour through ancient civilization and sculpture galleries.', ev1.Capacity=40;
MERGE (ev2:Event:EVENT {Event_ID:'EV002'}) SET ev2.Event_Name='Traditional Pottery Workshop', ev2.Event_Date='2026-11-08', ev2.Start_Time='14:00', ev2.End_Time='17:00', ev2.Venue='Education Courtyard', ev2.Description='Hands-on terracotta shaping, wheel throwing, and slip decoration workshop.', ev2.Capacity=25;
MERGE (ev3:Event:EVENT {Event_ID:'EV003'}) SET ev3.Event_Name='Curator Evening Talk: Chola Metallurgy', ev3.Event_Date='2026-11-12', ev3.Start_Time='18:00', ev3.End_Time='19:30', ev3.Venue='Auditorium A', ev3.Description='In-depth lecture examining the casting science behind 10th-century Chola bronzes.', ev3.Capacity=75;
MERGE (ev4:Event:EVENT {Event_ID:'EV004'}) SET ev4.Event_Name='Family Art & Discovery Day', ev4.Event_Date='2026-11-15', ev4.Start_Time='10:30', ev4.End_Time='15:30', ev4.Venue='Central Atrium', ev4.Description='Interactive treasure hunt, sketching sessions and child-friendly museum puzzles.', ev4.Capacity=100;
MERGE (ev5:Event:EVENT {Event_ID:'EV005'}) SET ev5.Event_Name='Conservation Live Demonstration', ev5.Event_Date='2026-11-18', ev5.Start_Time='11:00', ev5.End_Time='12:30', ev5.Venue='Conservation Lab Viewing Bay', ev5.Description='Watch conservators clean and stabilize historical metal and ceramic artifacts.', ev5.Capacity=30;
MERGE (ev6:Event:EVENT {Event_ID:'EV006'}) SET ev6.Event_Name='Student Research Symposium', ev6.Event_Date='2026-11-22', ev6.Start_Time='09:30', ev6.End_Time='16:00', ev6.Venue='Conference Hall B', ev6.Description='Academic paper presentations by university students on regional heritage conservation.', ev6.Capacity=80;
MERGE (ev7:Event:EVENT {Event_ID:'EV007'}) SET ev7.Event_Name='Archaeology Heritage Lecture', ev7.Event_Date='2026-11-25', ev7.Start_Time='17:00', ev7.End_Time='18:30', ev7.Venue='Auditorium A', ev7.Description='Keynote on recent excavations revealing ancient maritime trade routes.', ev7.Capacity=90;
MERGE (ev8:Event:EVENT {Event_ID:'EV008'}) SET ev8.Event_Name='Night at the Museum Lantern Tour', ev8.Event_Date='2026-11-29', ev8.Start_Time='19:30', ev8.End_Time='21:00', ev8.Venue='Sculpture & Rotunda Wings', ev8.Description='Experience the silent majesty of ancient sculptures illuminated by atmospheric lighting.', ev8.Capacity=50;

// Visitors (Tagged with Visitor and VISITOR)
MERGE (v1:Visitor:VISITOR {Visitor_ID:'V001'}) SET v1.Name='Aarav Sharma', v1.Email='aarav.sharma@example.com', v1.Phone='+91 98765 43210', v1.Date_of_Birth='2005-04-12', v1.Gender='Male', v1.Visitor_Type='Student', v1.Registration_Date='2026-09-01';
MERGE (v2:Visitor:VISITOR {Visitor_ID:'V002'}) SET v2.Name='Ananya Rao', v2.Email='ananya.rao@example.com', v2.Phone='+91 98765 43211', v2.Date_of_Birth='2004-11-23', v2.Gender='Female', v2.Visitor_Type='General', v2.Registration_Date='2026-09-03';
MERGE (v3:Visitor:VISITOR {Visitor_ID:'V003'}) SET v3.Name='Rohan Kulkarni', v3.Email='rohan.kulkarni@example.com', v3.Phone='+91 98765 43212', v3.Date_of_Birth='1998-06-18', v3.Gender='Male', v3.Visitor_Type='Senior Researcher', v3.Registration_Date='2026-09-10';
MERGE (v4:Visitor:VISITOR {Visitor_ID:'V004'}) SET v4.Name='Priya Sundaram', v4.Email='priya.sundaram@example.com', v4.Phone='+91 98765 43213', v4.Date_of_Birth='2001-02-14', v4.Gender='Female', v4.Visitor_Type='Art Student', v4.Registration_Date='2026-09-15';
MERGE (v5:Visitor:VISITOR {Visitor_ID:'V005'}) SET v5.Name='Vikram Malhotra', v5.Email='vikram.m@example.com', v5.Phone='+91 98765 43214', v5.Date_of_Birth='1985-08-30', v5.Gender='Male', v5.Visitor_Type='Historian', v5.Registration_Date='2026-09-20';
MERGE (v6:Visitor:VISITOR {Visitor_ID:'V006'}) SET v6.Name='Sneha Patel', v6.Email='sneha.patel@example.com', v6.Phone='+91 98765 43215', v6.Date_of_Birth='2002-12-05', v6.Gender='Female', v6.Visitor_Type='Tourist', v6.Registration_Date='2026-09-25';

// Visits (Tagged with Visit and VISIT)
MERGE (vis1:Visit:VISIT {Visit_ID:'VIS001'}) SET vis1.Visit_Date='2026-10-10', vis1.Entry_Time='10:00', vis1.Exit_Time='12:30', vis1.Duration_Minutes=150;
MERGE (vis2:Visit:VISIT {Visit_ID:'VIS002'}) SET vis2.Visit_Date='2026-10-11', vis2.Entry_Time='14:00', vis2.Exit_Time='16:00', vis2.Duration_Minutes=120;
MERGE (vis3:Visit:VISIT {Visit_ID:'VIS003'}) SET vis3.Visit_Date='2026-10-15', vis3.Entry_Time='11:15', vis3.Exit_Time='14:45', vis3.Duration_Minutes=210;
MERGE (vis4:Visit:VISIT {Visit_ID:'VIS004'}) SET vis4.Visit_Date='2026-10-18', vis4.Entry_Time='09:45', vis4.Exit_Time='12:15', vis4.Duration_Minutes=150;
MERGE (vis5:Visit:VISIT {Visit_ID:'VIS005'}) SET vis5.Visit_Date='2026-10-22', vis5.Entry_Time='15:00', vis5.Exit_Time='18:00', vis5.Duration_Minutes=180;
MERGE (vis6:Visit:VISIT {Visit_ID:'VIS006'}) SET vis6.Visit_Date='2026-10-25', vis6.Entry_Time='10:30', vis6.Exit_Time='13:00', vis6.Duration_Minutes=150;

// Visitor -> MADE -> Visit
MERGE (v1)-[:MADE]->(vis1);
MERGE (v1)-[:MADE_VISIT]->(vis1);
MERGE (v2)-[:MADE]->(vis2);
MERGE (v2)-[:MADE_VISIT]->(vis2);
MERGE (v3)-[:MADE]->(vis3);
MERGE (v3)-[:MADE_VISIT]->(vis3);
MERGE (v4)-[:MADE]->(vis4);
MERGE (v4)-[:MADE_VISIT]->(vis4);
MERGE (v5)-[:MADE]->(vis5);
MERGE (v5)-[:MADE_VISIT]->(vis5);
MERGE (v6)-[:MADE]->(vis6);
MERGE (v6)-[:MADE_VISIT]->(vis6);

// Visit -> INCLUDED -> Gallery & VISITED_GALLERY
MERGE (vis1)-[:INCLUDED]->(g1);
MERGE (vis1)-[:VISITED_GALLERY]->(g1);
MERGE (vis1)-[:INCLUDED]->(g2);
MERGE (vis1)-[:VISITED_GALLERY]->(g2);

MERGE (vis2)-[:INCLUDED]->(g2);
MERGE (vis2)-[:VISITED_GALLERY]->(g2);
MERGE (vis2)-[:INCLUDED]->(g3);
MERGE (vis2)-[:VISITED_GALLERY]->(g3);

MERGE (vis3)-[:INCLUDED]->(g1);
MERGE (vis3)-[:VISITED_GALLERY]->(g1);
MERGE (vis3)-[:INCLUDED]->(g7);
MERGE (vis3)-[:VISITED_GALLERY]->(g7);
MERGE (vis3)-[:INCLUDED]->(g9);
MERGE (vis3)-[:VISITED_GALLERY]->(g9);

MERGE (vis4)-[:INCLUDED]->(g3);
MERGE (vis4)-[:VISITED_GALLERY]->(g3);
MERGE (vis4)-[:INCLUDED]->(g4);
MERGE (vis4)-[:VISITED_GALLERY]->(g4);

MERGE (vis5)-[:INCLUDED]->(g5);
MERGE (vis5)-[:VISITED_GALLERY]->(g5);
MERGE (vis5)-[:INCLUDED]->(g6);
MERGE (vis5)-[:VISITED_GALLERY]->(g6);

MERGE (vis6)-[:INCLUDED]->(g1);
MERGE (vis6)-[:VISITED_GALLERY]->(g1);
MERGE (vis6)-[:INCLUDED]->(g8);
MERGE (vis6)-[:VISITED_GALLERY]->(g8);
MERGE (vis6)-[:INCLUDED]->(g10);
MERGE (vis6)-[:VISITED_GALLERY]->(g10);

// Direct Visitor -> VISITED -> Gallery
MERGE (v1)-[:VISITED]->(g1);
MERGE (v1)-[:VISITED]->(g2);
MERGE (v2)-[:VISITED]->(g2);
MERGE (v2)-[:VISITED]->(g3);
MERGE (v3)-[:VISITED]->(g1);
MERGE (v3)-[:VISITED]->(g7);
MERGE (v4)-[:VISITED]->(g3);
MERGE (v5)-[:VISITED]->(g5);
MERGE (v6)-[:VISITED]->(g1);

// Visitor -> REGISTERED_FOR -> Event
MERGE (v1)-[:REGISTERED_FOR]->(ev1);
MERGE (v2)-[:REGISTERED_FOR]->(ev2);
MERGE (v3)-[:REGISTERED_FOR]->(ev3);
MERGE (v4)-[:REGISTERED_FOR]->(ev4);
MERGE (v5)-[:REGISTERED_FOR]->(ev5);
MERGE (v6)-[:REGISTERED_FOR]->(ev8);

// Feedback nodes and Visitor -> PROVIDED -> Feedback
MERGE (fb1:Feedback:VISITOR_FEEDBACK {Feedback_ID:'FB001'}) SET fb1.Rating=5, fb1.Comment='Breathtaking Chola bronze collection and immaculate gallery ambiance.', fb1.Date='2026-10-10';
MERGE (fb2:Feedback:VISITOR_FEEDBACK {Feedback_ID:'FB002'}) SET fb2.Rating=4, fb2.Comment='Loved the interactive terracotta pottery demonstration.', fb2.Date='2026-10-12';
MERGE (fb3:Feedback:VISITOR_FEEDBACK {Feedback_ID:'FB003'}) SET fb3.Rating=5, fb3.Comment='Rare palm-leaf manuscripts are exceptionally well preserved and displayed.', fb3.Date='2026-10-16';

MERGE (v1)-[:PROVIDED]->(fb1);
MERGE (v2)-[:PROVIDED]->(fb2);
MERGE (v3)-[:PROVIDED]->(fb3);

// Staff and Conservation
MERGE (st1:Staff:CONSERVATION_STAFF {Staff_ID:'ST001'}) SET st1.Name='Dr. Meera Iyer', st1.Role='Senior Conservator', st1.Specialization='Metals & Ceramics';
MERGE (st2:Staff:CONSERVATION_STAFF {Staff_ID:'ST002'}) SET st2.Name='Karan Verma', st2.Role='Archival Conservator', st2.Specialization='Manuscripts & Textiles';

MERGE (ca1:Conservation:CONSERVATION_ACTIVITY {Conservation_ID:'CA001'}) SET ca1.Title='Laser Cleaning & Stabilization', ca1.Status='Completed', ca1.Date='2026-09-20';
MERGE (ca2:Conservation:CONSERVATION_ACTIVITY {Conservation_ID:'CA002'}) SET ca2.Title='Deacidification & Humectant Treatment', ca2.Status='In Progress', ca2.Date='2026-10-05';

MERGE (st1)-[:PERFORMED]->(ca1);
MERGE (ca1)-[:CONSERVES]->(a1);
MERGE (st2)-[:PERFORMED]->(ca2);
MERGE (ca2)-[:CONSERVES]->(a11);
