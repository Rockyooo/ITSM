content = open("frontend/src/pages/TicketDetail.tsx", encoding="utf-8").read()
lines = content.split("\n")
print(f"Total lineas: {len(lines)}")
# Ver si el archivo esta truncado - buscar la ultima funcion
for i, line in enumerate(lines[-20:], len(lines)-20):
    print(f"{i}: {line}")
