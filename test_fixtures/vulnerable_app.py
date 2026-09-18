import sqlite3

AWS_SECRET_KEY = "AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345"

def get_user_profile(user_input: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # VULNERABILITY: Raw string interpolation leading to SQL Injection
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    cursor.execute(query)
    return cursor.fetchall()