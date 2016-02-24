"""
Routes and views for the flask application.
"""

from datetime import datetime
from flask import render_template
from Messenger import app

@app.route('/')
@app.route('/home')
def home():
    """Renders the home page."""
    return render_template(
        'index.html',
        title='Messenger',
        year=datetime.now().year,
    )