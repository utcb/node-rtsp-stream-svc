#!/bin/bash

sqlite3 data.db << EOF
create table if not exists device(id varchar(64) not null primary key, token varchar(32) not null, duration integer default null, url varchar(255) default null);

.exit
EOF

## demo data
# insert into device(id, token, duration, url) values('DH-6F0B9C8PAZ10FAA', '13579adgjl', 60, 'rtsp://555555:c55555%43%43@10.1.0.98:554/cam/realmonitor?channel=1&subtype=0');

##
