# CS262_Messaging_App
Messaging App for CS262 Assignment

Start using protocol buffers:

python application.py --protobuff

Start using RESTFUL

python application.py 

Can also be switched on the app

# Setup
- pip install flask
- pip install mysql
- pip install flask_login
- If you see some error with dll's, run the below command:
	brew install --upgrade openssl; brew unlink openssl && brew link openssl --force
- To run the server, run python application.py
- To connect with the database, run the following command
	mysql -h messenger.c57b9wmfsuhp.us-east-1.rds.amazonaws.com -P 3306 -u cs262admin -p
	The password is cs262project 

# Description
For our CS262 project, we implemented protocol buffers and a RESTFUL API. On top of this, we built a web UI to interact with the server. The database is deployed online on AWS. Interact with the right side bar to find users to message and create and find groups to message. Authentication has also been implemented as well. You can also login, logout, and delete your accoun .

# Functionality
- List accounts 
- Create a group
- List groups 
- Send a message. If the message is sent to an account, send a single message; if it is sent to a group, send to all members of the group.
- If the recipient is logged in, deliver immediately; otherwise queue the message and deliver on demand
- Deliver undelivered messages
- Delete an account

