import sys
import os

# Ajustar path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.routers.auth import get_password_hash

def reset_admin():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@fusion-it.co").first()
        if user:
            user.hashed_password = get_password_hash("Admin123!")
            db.commit()
            print("Contrasena de admin@fusion-it.co restablecida a: Admin123!")
        else:
            print("No existe un usuario con el correo admin@fusion-it.co en la base de datos.")
    except Exception as e:
        print("Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
