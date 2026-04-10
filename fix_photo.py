path = r'frontend/src/pages/Usuarios.tsx'
c = open(path, encoding='utf-8').read()
old = '                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#94a3b8" }}>Pega una URL de imagen (JPG, PNG, WebP)</p>'
new = '''                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#94a3b8" }}>JPG, PNG, WebP max 2MB</p>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "6px", padding: "5px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "11px", color: "#475569" }}>
                        <Camera size={13}/> Subir archivo
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file || file.size > 2*1024*1024) return;
                          const reader = new FileReader();
                          reader.onload = ev => setForm(p => ({ ...p, photo_url: ev.target?.result as string }));
                          reader.readAsDataURL(file);
                        }}/>
                      </label>'''
c = c.replace(old, new, 1)
open(path, 'w', encoding='utf-8').write(c)
print("OK foto")
