import urllib.request, os

# Escribir el archivo correcto usando el contenido del archivo de salida
dest = r'frontend/src/pages/TicketDetail.tsx'
print(f'Archivo actual: {sum(1 for _ in open(dest, encoding=\"utf-8\"))} lineas')

# Leer el archivo que esta en outputs y copiarlo
src = r'C:/Users/🃏/Downloads/TicketDetail.tsx'
if os.path.exists(src):
    import shutil
    shutil.copy(src, dest)
    print('Copiado desde Downloads')
else:
    print('No encontrado en Downloads, usa el link del chat para descargarlo')
