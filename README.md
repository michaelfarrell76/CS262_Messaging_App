# CS262_Messaging_App
Messaging App for CS262 Assignment

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
	
# Done
- Build chat client UI
- Set up database for the application 
- Setup routes for global chat
- Setup authentication
- Set up ability to send/receieve messages

# Todo
- Create some user interface for messaging different users
- Create the ability to have separate chats with different people. 
	- This should simply be a different SQL query that pulls only messages of certain users. The messenger table might need to be changed to include an array of users rather than a single user. 
- Make some user interface to indicate when sent messages fail to send. Not really sure what the cases are here when the messages will fail to send. 
- Create some button/interface for logging out
	- Right now, you can logout by going to the logout page, which redirects to the login page.
- Create an option on the UI for deleting an account.
- MINOR: Make sure that the Flask flash function is working. Right now, if you enter incorrect login information, nothing happens. However, a warning should be flashing. An example of this is line 138 in application.py. A working example is here: http://code.runnable.com/UpxV-sc6mUcmAACz/basic-usage-of-message-flashing-in-flask-for-python
- MINOR: There is a bit of lag between when a message is sent and when it appears in the chat box. This is because the message needs to get sent to the server, and then an AJAX call to the server gets the message and displays it. Implement something that skips this process for sent mesages. 


# Expected Functionality
- List accounts (or a subset of the accounts, by text wildcard)
- Create a group
- List groups (or a subset of groups, by text wildcard)
- Send a message. If the message is sent to an account, send a single message; if it is sent to a group, send to all members of the group.
- If the recipient is logged in, deliver immediately; otherwise queue the message and deliver on demand
- Deliver undelivered messages
- Delete an account

