"""Available configuration values. These values are imported 
during the instantiation of the application. They are used by
AWS for configuration purposes of the application"""

AWS_REGION = 'us-east-1'
STARTUP_SIGNUP_TABLE = 'your_ddb_table_name'
NEW_SIGNUP_TOPIC = 'your_sns_topic_name'
THEME = 'default'
FLASK_DEBUG = 'true'