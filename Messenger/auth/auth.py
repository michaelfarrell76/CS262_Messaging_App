import flask.ext.login as flask_login
from sqlalchemy.orm import sessionmaker, scoped_session

class User(flask_login.UserMixin):
    def __init__(self, user_id, username, email): 
        self.username = username
        self.id = user_id
        self.email = email

# class AuthLoaders():
#     def __init__(self, login_manager):
#         login_manager = login_manager

#     @login_manager.user_loader
#     def user_loader(email):
#         Session = scoped_session(sessionmaker(bind=engine))
#         s = Session()
#         result_proxy = s.execute('SELECT name, email FROM users WHERE email = "' + email + '" LIMIT 1')
#         s.close()
#         if result_proxy is None:
#             return
#         result = result_proxy.fetchone()
#         name = result[0]
#         user = User(name, email)
#         return user

#     @login_manager.request_loader
#     def request_loader(request):
#         email = request.form.get('email')
#         Session = scoped_session(sessionmaker(bind=engine))
#         s = Session()
#         result_proxy = s.execute('SELECT name, password FROM users WHERE email = "' + email + '" LIMIT 1')    
#         s.close()
#         if result_proxy is None:
#             return
#         result = result_proxy.fetchone()
#         name = result[0]
#         password = result[1]
#         user = User(name, email)
#         # DO NOT ever store passwords in plaintext and always compare password
#         # hashes using constant-time comparison!
#         user.is_authenticated = request.form['password'] == password
#         return user