"""
Configures AWS
Generates routes and views for the flask application.
"""

# Module used for managing configuration and setup
import os
import sys
import time

# Used for parsing responses from the database
import ast
from datetime import datetime
from sqlalchemy import exc
import _mysql
import sqlalchemy 
from sqlalchemy.orm import sessionmaker, scoped_session

# Modules used for managing flask requests and rendering templates
import flask
from flask import request, Response, render_template, flash, redirect
import json

# Modules used for authentication of the user
from auth.auth import User
import flask.ext.login as flask_login
from flask_login import LoginManager, current_user
from werkzeug.security import generate_password_hash, \
     check_password_hash

# Used for protobufs
import message_pb2
import base64
import optparse
global USE_PROTOBUFF 
USE_PROTOBUFF = False
USER = 0
GROUP = 1

# Default config vals
FLASK_DEBUG = 'false' if os.environ.get('FLASK_DEBUG') is None else os.environ.get('FLASK_DEBUG')

# Create the Flask app
application = flask.Flask(__name__)

# Load config values specified above
application.config.from_object('config')

# Only enable Flask debugging if an env var is set to true
application.debug = application.config['FLASK_DEBUG'] in ['true', 'True']

# Setup of the database engine
application.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://cs262admin:cs262project@messenger.c57b9wmfsuhp.us-east-1.rds.amazonaws.com/messenger'
engine = sqlalchemy.create_engine(application.config['SQLALCHEMY_DATABASE_URI'])

# Authentication for the application
application.secret_key = 'testtesttest'
login_manager = LoginManager()
login_manager.init_app(application)
login_manager.login_view = 'login'

@login_manager.user_loader
def user_loader(user_id):
    """ 
    This function is called every request to generate the user object from
    the user_id stored in session. This follows the standard approach for the
    flask-login module.
    """
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result_proxy = s.execute('SELECT name, email FROM users WHERE id = "' + user_id + '" LIMIT 1')
    s.close()
    result = result_proxy.fetchone()
    if result is None:
        return
    name = result[0]
    email = result[1]
    user = User(user_id, name, email)
    return user

@login_manager.request_loader
def request_loader(request):
    """ 
    This function is called during every request to validate that the user is still
    valid in the database. This enures that all users do not retain access if a user 
    is deleted or a password has changed. 
    """
    email = request.form.get('email')
    if email is not None:
        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT id, name, password FROM users WHERE email = "' + email + '" LIMIT 1')    
        s.close()
        if result_proxy is None:
            return
        result = result_proxy.fetchone()
        user_id = result[0]
        name = result[1]
        password = result[2]
        user = User(user_id, name, email)
        user.is_authenticated = generate_password_hash(request.form['password']) == password    
        application.logger.error(user)
        return user
    return

@application.route('/')
@flask_login.login_required
def home():
    """ 
    This is the function that handles the route for the home page. It uses the Jinja engine
    to render the index template. Beacuse authentication is required, we add a decorator 
    indicating login_required. 
    """
    global USE_PROTOBUFF 

    """Renders the chat page."""
    return render_template(
        'index.html',
        title='Messenger',
        year=datetime.now().year,
        USE_PROTOBUFF=USE_PROTOBUFF
    )

@application.route('/login', methods=['POST', 'GET'])
def login():
    """
    This is the function that handles the route for the login page. Authentication is not 
    required. The post method handles the logic for logging in and the get method renders 
    the template. It uses the Jinja engine to render the index template.
    """
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT id, name, password FROM users WHERE email = "' + email + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()

        if result == None:
            flash('Email Address not found')
            return json.dumps({}, 500, {'ContentType':'application/json'})
        
        true_password = result[2]

        if check_password_hash(true_password, password):
            user_id = result[0]
            name = result[1]

            user = User(user_id, name, email)
            flask_login.login_user(user)
            data = {'email': email, 'name':name}
            application.logger.debug(data)
            resp = Response(data, status=200, mimetype='application/json')
            return json.dumps(data, 200, {'ContentType':'application/json'})
        else:
            flash('Passwords do not match')
            return json.dumps({}, 500, {'ContentType':'application/json'})
    else:
        return render_template(
            'login.html'
        )

@application.route('/register', methods=['POST', 'GET'])
def register():
    """
    This is the function that handles the route for the register page. It uses the Jinja engine
    to render the index template. Authentication is not required.
    """
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])

        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT * FROM users WHERE email = "' + email + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()
        if result is not None:
            flash('That email has already been registered')
            return json.dumps({}, 403, {'ContentType':'application/json'})
        try:
            Session = scoped_session(sessionmaker(bind=engine))
            s = Session()
            s.execute('INSERT INTO users(name, email, password) VALUES ("' + str(name) + '","' + str(email) + '","' + str(password) + '")') 
            result_proxy = s.execute ('SELECT * FROM users WHERE email = "' + email + '" LIMIT 1')
            s.commit()
            s.close()
            result = result_proxy.fetchone()
            user_id = result[0]
            user = User(user_id, name, email)
            flask_login.login_user(user)
            data = {'email': email, 'name':name}
            return json.dumps(data, 200, {'ContentType':'application/json'})
        except:
            flash('An error occurred')
            return json.dumps({}, 403, {'ContentType':'application/json'})
    else:
        return render_template(
            'register.html'
        )

@application.route('/send_message', methods=['POST'])
def send_message():
    """
    This endpoint is hit via an AJAX call whenever a message is sent. Depending on 
    whether or not the USE_PROTOBUFF method is true, the message is parsed as JSON 
    or as a protocol buffer. The only method available is POST. The resulting message
    is then saved in a database.
    """
    global USE_PROTOBUFF 

    if USE_PROTOBUFF:
        MsgClient = message_pb2.MsgClient()

        result = base64.b64decode(request.form['protoString'])
        MsgClient.ParseFromString(result)

        other_id = str(MsgClient.id)
        message = MsgClient.message
        select_type = MsgClient.chat_type

    else:
        other_id =  request.form['other_uid']
        select_type =  int(request.form['select_type'])
        message = request.form['message']



    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()

    if select_type == USER:
        user_ids = sorted([current_user.id, other_id])
        users_str = '"[' + ", ".join(user_ids) + ']"'
        query = 'SELECT * from groups WHERE user_ids = %s LIMIT 1' % users_str
        result_proxy = s.execute(query)
        result = result_proxy.fetchone()
        if result is None:
            query = 'insert into groups (groupname, user_ids) VALUES("twousers", %s)' % users_str
            s.execute(query)
            query = 'SELECT * from groups WHERE user_ids = %s LIMIT 1' % users_str
            result_proxy = s.execute(query)
            result = result_proxy.fetchone()
    else:
        query = 'SELECT * from groups WHERE group_id = %s LIMIT 1' % other_id
        result_proxy = s.execute(query)
        result = result_proxy.fetchone()

    group_id = result[0]
    group_name = result[1]

    

    pkg = (str(current_user.id), str(message) , time.strftime("%Y-%m-%d %H:%M:%S"), group_id)
    query = 'INSERT INTO messages(user_id, message, time_sent, group_id) '  + \
                        'VALUES ("%s", "%s", "%s", %d)' % pkg
    s.execute(query)
    s.commit()
    s.close() 
    return json.dumps({}, 200, {'ContentType':'application/json'})

@application.route('/get_messages', methods=['POST'])
def get_message():
    """
    This endpoint is hit via an AJAX POST call periodically at intervals specified
    in the client. Depending on whether or not the USE_PROTOBUFF method
    is true, the message is sent as JSON or as a protocol buffer. This method 
    grabs all messages from the database that the user has permission to see. 
    """

    global USE_PROTOBUFF 

    if USE_PROTOBUFF:
        PreMsgClient = message_pb2.MsgClient()

        result = base64.b64decode(request.form['protoString'])
        PreMsgClient.ParseFromString(result)

        other_user = str(PreMsgClient.id)
        select_type = PreMsgClient.chat_type

    else:
        other_user =  request.form['user_id']
        select_type =  int(request.form['select_type'])

    out = []
    
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    
    if select_type == USER:
        user_ids = sorted([current_user.id, other_user])
        users_str = '"[' + ", ".join(user_ids) + ']"'
        query = 'SELECT * from groups WHERE user_ids = %s LIMIT 1' %users_str
        result_proxy = s.execute(query)
        result = result_proxy.fetchone()
        if result is None:
            s.close()
            return json.dumps(out)
        group_id = result[0]
    else:
        group_id = other_user
 
    result_proxy = s.execute('SELECT messages.id, users.name, messages.message from messages JOIN users ON users.id=messages.user_id where group_id = %s' % group_id)
    s.close()
    results = result_proxy.fetchall()

    for result in reversed(results):
        message_id = result[0]
        name = result[1]
        message = result[2]
        if USE_PROTOBUFF:
                out.append(message_pb2.Msg(
                    message_id = int(message_id),
                    name = name,
                    message = message
                    ))
        else:
            out.append((message_id, name, message))
   
    if USE_PROTOBUFF:
        PostMsgClient = message_pb2.PostMsgClient(messages = out)
        return base64.b64encode(PostMsgClient.SerializeToString())
    else:
        return json.dumps(out)

@application.route('/get_users')
def get_users():
    """
    This endpoint is hit via an AJAX POST request periodically at intervals specified 
    in the client. Similar to before, depending on whether or not the USE_PROTOBUFF 
    method is true, the message is sent as JSON or as a protocol buffer. This method 
    grabs all messages from the database that the user has permission to see. 
    """

    global USE_PROTOBUFF 
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result = s.execute('SELECT * FROM users')
    s.close()
    results = result.fetchall()

    out = []

    for result in results:
        user_id = result[0]
        name = result[1]
        if user_id != int(current_user.id):
            if USE_PROTOBUFF:
                out.append(message_pb2.UsrGrp(
                    name = name,
                    id = int(user_id),
                    ))
            else:
                out.append((user_id, name))
    if USE_PROTOBUFF:
        print(out)
        UsrUsrs = message_pb2.UsrGrpClient(members = out)
        return base64.b64encode(UsrUsrs.SerializeToString())
    else:
        return json.dumps(out)

@application.route('/logout')
def logout():
    """
    Endpoint that allows a user to logout. Logout buttons are linked this endpoint
    """
    flask_login.logout_user()
    return redirect("login", code=302)

@application.route('/transfer')
def transfer():
    """
    Endpoint that allows user to toggle between protocol buffers and REST. 
    """
    global USE_PROTOBUFF 
    print(USE_PROTOBUFF)
    USE_PROTOBUFF = not USE_PROTOBUFF
    return redirect("/", code=302)

@application.route('/delete_account')
def delete_account():
    '''
    Endpoint that allows account to be deleted. Logs out the user before deleting.
    '''
    Session = scoped_session(sessionmaker(bind=engine))
    uid_to_delete = current_user.id
    flask_login.logout_user()
    s = Session()
    result_proxy = s.execute('DELETE FROM users WHERE id='+ uid_to_delete)
    s.commit()
    s.close()

    return redirect("login", code=302)

@application.route('/create_group', methods=['POST', 'GET'])
def create_group():
    '''
    Endpoint that allows the user to generate a group. GET request generates
    the form required to create the group. POST request makes the DB calls to
    create the group. 
    '''
    global USE_PROTOBUFF 
    if request.method == 'POST':

        if USE_PROTOBUFF:
            GrpCreateClient = message_pb2.UsrGrp()

            result = base64.b64decode(request.form['protoString'])
            GrpCreateClient.ParseFromString(result)

            name = GrpCreateClient.name
            user_ids = GrpCreateClient.user_ids
        else:
            name = request.form['name']
            user_ids = request.form['user_ids']
       
       
        user_ids = user_ids.split(',')
        user_ids = [int(user_id) for user_id in user_ids]
        user_ids.append(int(current_user.id))

        user_ids.sort()
        if len(user_ids) <= 2:
            flash('Groups must be made with more than 2 people')
            return json.dumps({}, 403, {'ContentType':'application/json'})
        
        user_ids = str(user_ids)
        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT * FROM groups WHERE user_ids = "' + user_ids + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()
        if result is not None:
            flash('That group has already been created')
            return json.dumps({}, 403, {'ContentType':'application/json'})
        try:
            Session = scoped_session(sessionmaker(bind=engine))
            s = Session()
            s.execute('INSERT INTO groups(groupname, user_ids) VALUES ("' + name + '","' + user_ids + '")') 
            s.commit()
            s.close()
            return json.dumps({}, 200, {'ContentType':'application/json'})
        except:
            return json.dumps({}, 403, {'ContentType':'application/json'})
    else:
        return render_template(
            'create_group.html'
        )

@application.route('/get_groups', methods=['POST', 'GET'])
def get_groups():
    '''
    This endpoint allows the user to get all available groups that can be talked to. 
    The groups that a user sees are based off of the permissions that they have available
    to them. 
    '''
    global USE_PROTOBUFF 
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result = s.execute('SELECT * FROM groups')
    s.close()
    results = result.fetchall()

    out = []

    for result in results:
        group_id = result[0]
        group_name = result[1]
        user_ids = ast.literal_eval(result[2])
        if len(user_ids) > 2 and int(current_user.id) in user_ids:
            if USE_PROTOBUFF:
                out.append(message_pb2.UsrGrp(
                    name = group_name,
                    id = int(group_id)
                    ))
            else:
                out.append((group_id, group_name))
    if USE_PROTOBUFF:
        grp_client = message_pb2.UsrGrpClient(members = out)
        return base64.b64encode(grp_client.SerializeToString())
  
    else:
        return json.dumps(out)


if __name__ == '__main__':
    ''' 
    Main function that allows options to be configured for the server.
    Runs the server on a specified host.
    '''
    parser = optparse.OptionParser()
    parser.add_option('--protobuff', action="store_true", default=False)

    options, args =  parser.parse_args()

    USE_PROTOBUFF = options.protobuff

    if USE_PROTOBUFF:
        print('Running with Protobuffs')
    else:
        print('Running with REST')
    application.run(host='0.0.0.0')