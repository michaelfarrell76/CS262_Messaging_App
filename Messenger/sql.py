# Used for parsing responses from the database, sql items
import ast
from datetime import datetime
from sqlalchemy import exc
import _mysql
import sqlalchemy 
from sqlalchemy.orm import sessionmaker, scoped_session



engine = sqlalchemy.create_engine('mysql://cs262admin:cs262project@messenger.c57b9wmfsuhp.us-east-1.rds.amazonaws.com/messenger')

Session = scoped_session(sessionmaker(bind=engine))
s = Session()
result_proxy = s.execute('SHOW tables')
results = result_proxy.fetchall()
print(results)
s.close()