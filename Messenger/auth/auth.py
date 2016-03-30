'''
Includes defintion for User class that interacts with 
flask_login to keep track of which user is currently logged in
'''

import flask.ext.login as flask_login
from sqlalchemy.orm import sessionmaker, scoped_session

class User(flask_login.UserMixin):
	'''
	Class for a User Object on the site
	'''
	def __init__(self, user_id, username, email): 
	    self.username = username
	    self.id = user_id
	    self.email = email