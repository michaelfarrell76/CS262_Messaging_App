#General
This is a general web-based messeneger application with a python backend. It has support for using both [Protocol Buffers](https://developers.google.com/protocol-buffers/) and [RESTFUL](http://www.tutorialspoint.com/restful/) as the communication method between the frontend and backend. This project was created for a course at Harvard University: CS 262, Distributed Systems.

You can access a live version of our chat application deployed on AWS [here](http://cs262chat.us-east-1.elasticbeanstalk.com/login), or if you wish to run this locally, it can be done with the command:

	python application.py --protobuff
	
to use protocol buffers and:

	python application.py 
	
to use RESTFUL

There is also a button that can be used to toggle between RESTFUL and protocol buffers in the web application itself.

# Folder Structure

    .
    ├── Messenger                    # Test files (alternatively `spec` or `tests`)
    │   ├── benchmarks          # Load and stress tests
    │   ├── integration         # End-to-end, integration tests (alternatively `e2e`)
    │   └── unit                # Unit tests
    └── ...
    
    
    .
    ├── Me                   # Compiled files (alternatively `dist`)
    ├── docs                    # Documentation files (alternatively `doc`)
    ├── src                     # Source files (alternatively `lib` or `app`)
    ├── test                    # Automated tests (alternatively `spec` or `tests`)
    ├── tools                   # Tools and utilities
    ├── LICENSE
    └── README.md

# Setup
- pip install flask
- pip install mysql
- pip install flask_login
- If you see some error with dll's, run the below command:
	brew install --upgrade openssl; brew unlink openssl && brew link openssl --force
- To run the server, run python application.py

# Description
For our CS262 project, we implemented protocol buffers and a RESTFUL API. On top of this, we built a web UI to interact with the server. The database is deployed online on AWS. Interact with the right side bar to find users to message and create and find groups to message. Authentication has also been implemented as well. You can also login, logout, and delete your account.

# Functionality
- List accounts 
- Create a group
- List groups 
- Send a message. If the message is sent to an account, send a single message; if it is sent to a group, send to all members of the group.
- If the recipient is logged in, deliver immediately; otherwise queue the message and deliver on demand
- Deliver undelivered messages
- Delete an account

