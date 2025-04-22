-- fill in test data

INSERT INTO user (id, display_name, email, password)
  VALUES (1, 't', 't@gmx.net', 't');
INSERT INTO user (id, display_name, email, password)
  VALUES (2, 'p', 'p@gmail.com', '$2b$10$R8MV/fqdRDU87GJxl7Nmj.AIwS.usbhuXqxzTTrp2LjdzC0AAXSoy');
INSERT INTO user (id, display_name, email, password)
  VALUES (3, 'Freiwilliger', 'frei@gmx.net', 'q');
INSERT INTO user (id, display_name, email, password)
  VALUES (4, 'Helfer', 'helf@gmx.net', 'q');
INSERT INTO user (id, display_name, email, password)
  VALUES (5, 'Registrierter', 'reg@gmx.net', 'q');

INSERT INTO team (id, name, admin_id)
  VALUES (1, 'New Group', 1);
INSERT INTO team (id, name, admin_id)
  VALUES (2, 'New Group 2', 1);
INSERT INTO team (id, name, admin_id)
  VALUES (3, 'Tolles Team', 2);

INSERT INTO event (id, name, start_datetime, team_id)
  VALUES (1, 'abc123', '2025-05-15T10:00', 1);
INSERT INTO event (id, name, start_datetime, team_id)
  VALUES (2, 'tolles event', '2025-05-15T10:00', 3);

INSERT INTO userXteam (user_id, team_id)
  VALUES (3, 3);
INSERT INTO userXteam (user_id, team_id)
  VALUES (4, 3);
INSERT INTO userXteam (user_id, team_id)
  VALUES (5, 3);

INSERT INTO userXevent (user_id, event_id)
  VALUES (4, 2);
INSERT INTO userXevent (user_id, event_id)
  VALUES (3, 2);

INSERT INTO job (id, event_id, type, user_id)
  VALUES (1, 2, 'SCORER', 4);
INSERT INTO job (id, event_id, type, user_id)
  VALUES (2, 2, 'SCORER', NULL);