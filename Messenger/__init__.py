"""
Used to initialize the flask application from a config file.
Modularizes the application so it can be imported later in other parts
of the application. 
"""

from flask import Flask
app = Flask(__name__)
app.config.from_pyfile('config.py')
import Messenger.application