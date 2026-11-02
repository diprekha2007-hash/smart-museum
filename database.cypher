// SMART MUSEUM — Neo4j setup for DBMS DA3
// Run this in Neo4j Browser. It creates constraints and sample data for all 23 DA1 entity types.
// If you already have data, do NOT run MATCH (n) DETACH DELETE n; this script does not delete data.

// 1) Uniqueness constraints
CREATE CONSTRAINT visitor_id_unique IF NOT EXISTS FOR (n:VISITOR) REQUIRE n.Visitor_ID IS UNIQUE;
CREATE CONSTRAINT rfid_card_id_unique IF NOT EXISTS FOR (n:RFID_CARD) REQUIRE n.Card_ID IS UNIQUE;
CREATE CONSTRAINT ticket_id_unique IF NOT EXISTS FOR (n:TICKET) REQUIRE n.Ticket_ID IS UNIQUE;
CREATE CONSTRAINT visit_id_unique IF NOT EXISTS FOR (n:VISIT) REQUIRE n.Visit_ID IS UNIQUE;
CREATE CONSTRAINT gallery_id_unique IF NOT EXISTS FOR (n:GALLERY) REQUIRE n.Gallery_ID IS UNIQUE;
CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS FOR (n:ARTIFACT) REQUIRE n.Artifact_ID IS UNIQUE;
CREATE CONSTRAINT artifact_type_id_unique IF NOT EXISTS FOR (n:ARTIFACT_TYPE) REQUIRE n.Artifact_Type_ID IS UNIQUE;
CREATE CONSTRAINT exhibition_id_unique IF NOT EXISTS FOR (n:EXHIBITION) REQUIRE n.Exhibition_ID IS UNIQUE;
CREATE CONSTRAINT kiosk_id_unique IF NOT EXISTS FOR (n:KIOSK) REQUIRE n.Kiosk_ID IS UNIQUE;
CREATE CONSTRAINT feedback_id_unique IF NOT EXISTS FOR (n:VISITOR_FEEDBACK) REQUIRE n.Feedback_ID IS UNIQUE;
CREATE CONSTRAINT preference_id_unique IF NOT EXISTS FOR (n:VISITOR_PREFERENCE) REQUIRE n.Preference_ID IS UNIQUE;
CREATE CONSTRAINT inspection_id_unique IF NOT EXISTS FOR (n:INSPECTION) REQUIRE n.Inspection_ID IS UNIQUE;
CREATE CONSTRAINT conservation_id_unique IF NOT EXISTS FOR (n:CONSERVATION_ACTIVITY) REQUIRE n.Conservation_ID IS UNIQUE;
CREATE CONSTRAINT staff_id_unique IF NOT EXISTS FOR (n:CONSERVATION_STAFF) REQUIRE n.Staff_ID IS UNIQUE;
CREATE CONSTRAINT researcher_id_unique IF NOT EXISTS FOR (n:RESEARCHER) REQUIRE n.Researcher_ID IS UNIQUE;
CREATE CONSTRAINT institution_id_unique IF NOT EXISTS FOR (n:ACADEMIC_INSTITUTION) REQUIRE n.Institution_ID IS UNIQUE;
CREATE CONSTRAINT request_id_unique IF NOT EXISTS FOR (n:RESEARCH_REQUEST) REQUIRE n.Request_ID IS UNIQUE;
CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (n:EVENT) REQUIRE n.Event_ID IS UNIQUE;
CREATE CONSTRAINT registration_id_unique IF NOT EXISTS FOR (n:PARTICIPANT_REGISTRATION) REQUIRE n.Registration_ID IS UNIQUE;

// 2) Create sample nodes. MERGE makes rerunning the script safe for these IDs.
MERGE (v1:VISITOR {Visitor_ID:'V001'}) SET v1.Name='Aarav Sharma', v1.Email='aarav@example.com', v1.Phone='9000000001', v1.Date_of_Birth='2005-04-12', v1.Gender='Male', v1.Registration_Date='2026-09-01';
MERGE (v2:VISITOR {Visitor_ID:'V002'}) SET v2.Name='Ananya Rao', v2.Email='ananya@example.com', v2.Phone='9000000002', v2.Date_of_Birth='2004-11-23', v2.Gender='Female', v2.Registration_Date='2026-09-03';
MERGE (card1:RFID_CARD {Card_ID:'C001'}) SET card1.RFID_Tag='RFID-1001', card1.Issue_Date='2026-09-01', card1.Expiry_Date='2027-09-01', card1.Status='Active';
MERGE (card2:RFID_CARD {Card_ID:'C002'}) SET card2.RFID_Tag='RFID-1002', card2.Issue_Date='2026-09-03', card2.Expiry_Date='2027-09-03', card2.Status='Active';
MERGE (t1:TICKET {Ticket_ID:'T001'}) SET t1.Ticket_Type='Student', t1.Purchase_Date='2026-10-01', t1.Valid_From='2026-10-01', t1.Valid_To='2026-10-31', t1.Price=100, t1.Status='Valid';
MERGE (t2:TICKET {Ticket_ID:'T002'}) SET t2.Ticket_Type='General', t2.Purchase_Date='2026-10-02', t2.Valid_From='2026-10-02', t2.Valid_To='2026-10-31', t2.Price=200, t2.Status='Valid';
MERGE (visit1:VISIT {Visit_ID:'VIS001'}) SET visit1.Visit_Date='2026-10-10', visit1.Entry_Time='10:00', visit1.Exit_Time='12:30';
MERGE (visit2:VISIT {Visit_ID:'VIS002'}) SET visit2.Visit_Date='2026-10-11', visit2.Entry_Time='14:00', visit2.Exit_Time='16:00';
MERGE (g1:GALLERY {Gallery_ID:'G001'}) SET g1.Gallery_Name='Ancient Civilizations', g1.Floor='Ground Floor', g1.Location='East Wing', g1.Capacity=80, g1.Description='Artifacts from early civilizations';
MERGE (g2:GALLERY {Gallery_ID:'G002'}) SET g2.Gallery_Name='Sculpture Gallery', g2.Floor='First Floor', g2.Location='West Wing', g2.Capacity=50, g2.Description='Historic stone and bronze sculptures';
MERGE (type1:ARTIFACT_TYPE {Artifact_Type_ID:'AT001'}) SET type1.Type_Name='Pottery', type1.Description='Historic ceramic objects';
MERGE (type2:ARTIFACT_TYPE {Artifact_Type_ID:'AT002'}) SET type2.Type_Name='Sculpture', type2.Description='Carved or modelled three-dimensional works';
MERGE (a1:ARTIFACT {Artifact_ID:'A001'}) SET a1.Title='Painted Terracotta Pot', a1.Description='Decorated terracotta vessel', a1.Historical_Information='Used for storage and daily life', a1.Origin='South India', a1.Period='Ancient', a1.Acquisition_Date='2020-03-10', a1.Current_Status='On Display';
MERGE (a2:ARTIFACT {Artifact_ID:'A002'}) SET a2.Title='Bronze Dancing Figure', a2.Description='Small bronze figurine', a2.Historical_Information='Illustrates traditional metal casting', a2.Origin='Tamil Nadu', a2.Period='Medieval', a2.Acquisition_Date='2019-07-21', a2.Current_Status='On Display';
MERGE (ex1:EXHIBITION {Exhibition_ID:'EX001'}) SET ex1.Exhibition_Name='Stories in Clay and Bronze', ex1.Theme='Everyday life and artistic traditions', ex1.Start_Date='2026-10-01', ex1.End_Date='2026-12-31', ex1.Description='Selected objects showing historic craftsmanship', ex1.Venue='Main Museum';
MERGE (ev1:EVENT {Event_ID:'EV001'}) SET ev1.Event_Name='Museum Heritage Walk', ev1.Event_Date='2026-11-05', ev1.Start_Time='10:00', ev1.End_Time='11:30', ev1.Venue='Main Museum', ev1.Description='Guided tour of selected galleries', ev1.Capacity=40;
MERGE (k1:KIOSK {Kiosk_ID:'K001'}) SET k1.Kiosk_Location='G001 entrance', k1.Installation_Date='2025-01-15', k1.Status='Active';
MERGE (fb1:VISITOR_FEEDBACK {Feedback_ID:'F001'}) SET fb1.Rating=5, fb1.Feedback_Text='The artifact descriptions were informative.', fb1.Feedback_Date='2026-10-10';
MERGE (pref1:VISITOR_PREFERENCE {Preference_ID:'P001'}) SET pref1.Preference_Type='Artifact Period', pref1.Preference_Value='Ancient', pref1.Recorded_Date='2026-10-10';
MERGE (insp1:INSPECTION {Inspection_ID:'IN001'}) SET insp1.Inspection_Date='2026-09-15', insp1.Condition='Good', insp1.Findings='No visible structural damage', insp1.Inspector_Name='Meera Iyer', insp1.Recommendation='Routine monitoring';
MERGE (ca1:CONSERVATION_ACTIVITY {Conservation_ID:'CA001'}) SET ca1.Activity_Type='Surface Cleaning', ca1.Start_Date='2026-09-20', ca1.End_Date='2026-09-21', ca1.Description='Dry cleaning of surface deposits', ca1.Cost=1500, ca1.Status='Completed';
MERGE (cs1:CONSERVATION_STAFF {Staff_ID:'CS001'}) SET cs1.Staff_Name='Meera Iyer', cs1.Qualification='M.A. Conservation', cs1.Specialization='Ceramics', cs1.Contact_Number='9000000101';
MERGE (researcher1:RESEARCHER {Researcher_ID:'R001'}) SET researcher1.Researcher_Name='Dr. Kavita Menon', researcher1.Email='kavita@example.edu', researcher1.Phone='9000000201', researcher1.Affiliation='Institute of Heritage Studies';
MERGE (inst1:ACADEMIC_INSTITUTION {Institution_ID:'AI001'}) SET inst1.Institution_Name='Institute of Heritage Studies', inst1.Address='Chennai, Tamil Nadu', inst1.Contact_Email='contact@example.edu';
MERGE (rr1:RESEARCH_REQUEST {Request_ID:'RR001'}) SET rr1.Request_Date='2026-10-05', rr1.Purpose='Study of ancient pottery motifs', rr1.Access_Type='On-site study', rr1.Status='Approved', rr1.Approval_Date='2026-10-07';
MERGE (reg1:PARTICIPANT_REGISTRATION {Registration_ID:'PR001'}) SET reg1.Registration_Date='2026-10-12', reg1.Attendance_Status='Registered';

// Junction entities from DA1 are represented as nodes as well as relationships so their attributes are retained.
MERGE (evArt:EXHIBITION_ARTIFACT {Exhibition_ID:'EX001', Artifact_ID:'A001'}) SET evArt.Display_Start_Date='2026-10-01', evArt.Display_End_Date='2026-12-31', evArt.Display_Position='Display Case 1';
MERGE (gv1:GALLERY_VISIT {Gallery_Visit_ID:'GV001'}) SET gv1.Entry_Time='10:15', gv1.Exit_Time='11:00';
MERGE (assign1:CONSERVATION_ASSIGNMENT {Conservation_ID:'CA001', Staff_ID:'CS001'}) SET assign1.Role='Lead conservator';
MERGE (rra1:RESEARCH_REQUEST_ARTIFACT {Request_ID:'RR001', Artifact_ID:'A001'}) SET rra1.Access_Level='Supervised';

// 3) Relationships — each MERGE avoids duplicate relationships when rerun.
MATCH (v1:VISITOR {Visitor_ID:'V001'}), (card1:RFID_CARD {Card_ID:'C001'}), (t1:TICKET {Ticket_ID:'T001'}), (visit1:VISIT {Visit_ID:'VIS001'}), (g1:GALLERY {Gallery_ID:'G001'}), (a1:ARTIFACT {Artifact_ID:'A001'}), (type1:ARTIFACT_TYPE {Artifact_Type_ID:'AT001'}), (ex1:EXHIBITION {Exhibition_ID:'EX001'}), (ev1:EVENT {Event_ID:'EV001'}), (k1:KIOSK {Kiosk_ID:'K001'}), (fb1:VISITOR_FEEDBACK {Feedback_ID:'F001'}), (pref1:VISITOR_PREFERENCE {Preference_ID:'P001'}), (insp1:INSPECTION {Inspection_ID:'IN001'}), (ca1:CONSERVATION_ACTIVITY {Conservation_ID:'CA001'}), (cs1:CONSERVATION_STAFF {Staff_ID:'CS001'}), (researcher1:RESEARCHER {Researcher_ID:'R001'}), (inst1:ACADEMIC_INSTITUTION {Institution_ID:'AI001'}), (rr1:RESEARCH_REQUEST {Request_ID:'RR001'}), (reg1:PARTICIPANT_REGISTRATION {Registration_ID:'PR001'}), (evArt:EXHIBITION_ARTIFACT {Exhibition_ID:'EX001', Artifact_ID:'A001'}), (gv1:GALLERY_VISIT {Gallery_Visit_ID:'GV001'}), (assign1:CONSERVATION_ASSIGNMENT {Conservation_ID:'CA001', Staff_ID:'CS001'}), (rra1:RESEARCH_REQUEST_ARTIFACT {Request_ID:'RR001', Artifact_ID:'A001'})
MERGE (v1)-[:HAS_RFID_CARD]->(card1)
MERGE (v1)-[:PURCHASED]->(t1)
MERGE (t1)-[:USES_CARD]->(card1)
MERGE (v1)-[:MADE_VISIT]->(visit1)
MERGE (visit1)-[:USING_TICKET]->(t1)
MERGE (visit1)-[:INCLUDES_GALLERY_VISIT]->(gv1)
MERGE (gv1)-[:VISITED_GALLERY]->(g1)
MERGE (g1)-[:CONTAINS_ARTIFACT]->(a1)
MERGE (a1)-[:CLASSIFIED_AS]->(type1)
MERGE (ex1)-[:HAS_EXHIBITION_ARTIFACT]->(evArt)
MERGE (evArt)-[:REFERS_TO_ARTIFACT]->(a1)
MERGE (k1)-[:LOCATED_IN]->(g1)
MERGE (fb1)-[:FEEDBACK_BY]->(v1)
MERGE (fb1)-[:FEEDBACK_FOR_ARTIFACT]->(a1)
MERGE (fb1)-[:SUBMITTED_AT]->(k1)
MERGE (pref1)-[:PREFERENCE_OF]->(v1)
MERGE (insp1)-[:INSPECTS]->(a1)
MERGE (ca1)-[:CONSERVATION_FOR]->(a1)
MERGE (assign1)-[:ASSIGNMENT_ACTIVITY]->(ca1)
MERGE (assign1)-[:ASSIGNED_STAFF]->(cs1)
MERGE (rr1)-[:REQUESTED_BY]->(researcher1)
MERGE (rr1)-[:SUBMITTED_THROUGH]->(inst1)
MERGE (rr1)-[:HAS_REQUEST_ARTIFACT]->(rra1)
MERGE (rra1)-[:REQUESTS_ACCESS_TO]->(a1)
MERGE (v1)-[:REGISTERED_FOR]->(reg1)
MERGE (reg1)-[:REGISTRATION_FOR_EVENT]->(ev1);

// Additional connected sample records
MATCH (v2:VISITOR {Visitor_ID:'V002'}), (card2:RFID_CARD {Card_ID:'C002'}), (t2:TICKET {Ticket_ID:'T002'}), (visit2:VISIT {Visit_ID:'VIS002'}), (g2:GALLERY {Gallery_ID:'G002'}), (a2:ARTIFACT {Artifact_ID:'A002'}), (type2:ARTIFACT_TYPE {Artifact_Type_ID:'AT002'}), (ex1:EXHIBITION {Exhibition_ID:'EX001'}), (evArt2:EXHIBITION_ARTIFACT {Exhibition_ID:'EX001', Artifact_ID:'A002'})
MERGE (v2)-[:HAS_RFID_CARD]->(card2)
MERGE (v2)-[:PURCHASED]->(t2)
MERGE (t2)-[:USES_CARD]->(card2)
MERGE (v2)-[:MADE_VISIT]->(visit2)
MERGE (visit2)-[:USING_TICKET]->(t2)
MERGE (visit2)-[:VISITED_GALLERY]->(g2)
MERGE (g2)-[:CONTAINS_ARTIFACT]->(a2)
MERGE (a2)-[:CLASSIFIED_AS]->(type2)
MERGE (ex1)-[:HAS_EXHIBITION_ARTIFACT]->(evArt2)
MERGE (evArt2)-[:REFERS_TO_ARTIFACT]->(a2);

// 4) Verification: counts by node label
MATCH (n) UNWIND labels(n) AS label RETURN label AS NodeType, count(*) AS Total ORDER BY NodeType;
