import flask.ext.login as flask_login
from sqlalchemy.orm import sessionmaker, scoped_session

class User(flask_login.UserMixin):
    def __init__(self, user_id, username, email): 
        self.username = username
        self.id = user_id
        self.email = email