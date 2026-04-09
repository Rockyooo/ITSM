import os
import httpx
from datetime import datetime

AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET")
MAIL_FROM = os.getenv("MAIL_FROM", "soporte@fusionit.co")

_token = None
_token_expires = 0

async def get_graph_token():
    global _token, _token_expires
    if _token and datetime.utcnow().timestamp() < _token_expires:
        return _token

    if not all([AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET]):
        return None

    url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
    data = {
        "client_id": AZURE_CLIENT_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": AZURE_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, data=data)
            if resp.status_code == 200:
                res_data = resp.json()
                _token = res_data["access_token"]
                _token_expires = datetime.utcnow().timestamp() + res_data.get("expires_in", 3599) - 300
                return _token
            else:
                print(f"Error al obtener token Graph API: {resp.text}")
        except Exception as e:
            print(f"Graph API Exception: {str(e)}")
    return None

async def send_graph_email(to_email: str, subject: str, content: str, ticket_number: str = None, is_reply: bool = False):
    token = await get_graph_token()
    if not token:
        print("Envio omitido: credenciales de Graph API no configuradas adecuadamente en entorno.")
        return False

    url = f"https://graph.microsoft.com/v1.0/users/{MAIL_FROM}/sendMail"
    
    internet_message_headers = []
    if ticket_number:
        # Construimos el formato id para threading
        msg_id = f"<{ticket_number}@itsm.fusionit.co>"
        if is_reply:
            internet_message_headers.append({"name": "In-Reply-To", "value": msg_id})
            internet_message_headers.append({"name": "References", "value": msg_id})
        else:
            internet_message_headers.append({"name": "Message-ID", "value": msg_id})

    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": content
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to_email
                    }
                }
            ],
            "internetMessageHeaders": internet_message_headers
        },
        "saveToSentItems": "true"
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 202):
                return True
            else:
                print(f"Error enviando email via Graph: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            print(f"Graph API Send Exception: {str(e)}")
            return False
