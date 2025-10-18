import tkinter as tk
from tkinter import Listbox, Text, END, LEFT, RIGHT, Y, BOTH
from tkinter import ttk
import json
import os
import sys
import base64
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def resource_path(relative_path):
    """ Hem normal hem de PyInstaller .exe'si olarak çalışırken dosya yolunu doğru verir. """
    try:
        # PyInstaller geçici bir yol oluşturur ve bunu _MEIPASS içinde saklar.
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


#  Encryption Functions 
KDF_ITERATIONS = 480000
SALT_SIZE = 16
NOTES_FILE = "notlar.json"

def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=KDF_ITERATIONS,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def encrypt_note(note_text: str, password: str) -> dict:
    salt = os.urandom(SALT_SIZE)
    key = derive_key(password, salt)
    f = Fernet(key)
    encrypted_data = f.encrypt(note_text.encode())
    return {
        "salt": base64.urlsafe_b64encode(salt).decode('utf-8'),
        "data": base64.urlsafe_b64encode(encrypted_data).decode('utf-8')
    }

def decrypt_note(encrypted_note: dict, password: str) -> str | None:
    try:
        salt = base64.urlsafe_b64decode(encrypted_note["salt"])
        encrypted_data = base64.urlsafe_b64decode(encrypted_note["data"])
        key = derive_key(password, salt)
        f = Fernet(key)
        decrypted_data = f.decrypt(encrypted_data)
        return decrypted_data.decode('utf-8')
    except (InvalidToken, TypeError, KeyError):
        return None


class PlaceholderEntry(ttk.Entry):
    def __init__(self, container, placeholder, *args, **kwargs):
        super().__init__(container, *args, **kwargs)
        self.placeholder = placeholder
        self.placeholder_color = '#888894'
        self.default_fg_color = self['foreground']
        self.bind("<FocusIn>", self._clear_placeholder)
        self.bind("<FocusOut>", self._add_placeholder)
        self.put_placeholder()
    def put_placeholder(self):
        if not self.get(): self.insert(0, self.placeholder); self['foreground'] = self.placeholder_color
    def _clear_placeholder(self, e):
        if self.get() == self.placeholder: self.delete(0, "end"); self['foreground'] = self.default_fg_color
    def _add_placeholder(self, e):
        if not self.get(): self.put_placeholder()

# Main class
class EncryptedNoteApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CryptexNote")
        self.root.geometry("850x600") 
        self.root.minsize(750, 500)

        self.setup_styles()
        self.load_icons() 

        main_frame = ttk.Frame(root, padding="15 15 15 15", style='App.TFrame') 
        main_frame.pack(expand=True, fill=BOTH)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(0, weight=1)

        left_frame = ttk.Frame(main_frame, style='App.TFrame')
        left_frame.grid(row=0, column=0, sticky="ns", padx=(0, 15)) 

        self.action_frame = ttk.Frame(main_frame, style='App.TFrame')
        self.action_frame.grid(row=0, column=1, sticky="nsew")

        self.status_label = ttk.Label(root, text="Uygulama hazır.", style='Status.TLabel', padding="10 5")
        self.status_label.pack(side="bottom", fill="x")
        
        ttk.Label(left_frame, text="Kaydedilen Notlar", style='Header.TLabel').pack(pady=(0, 10), anchor="w")
        
        list_frame = ttk.Frame(left_frame)
        list_frame.pack(expand=True, fill="both")

        self.tree = ttk.Treeview(list_frame, show="tree", selectmode="browse", style="Notes.TTreeview")
        self.tree.pack(side=LEFT, expand=True, fill='both')

        self.scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview, style='Modern.Vertical.TScrollbar')
        self.tree.config(yscrollcommand=self.scrollbar.set)

        self.tree.bind('<Double-Button-1>', self.open_note_prompt)

        button_frame = ttk.Frame(left_frame, style='App.TFrame')
        button_frame.pack(pady=15, fill=tk.X)
        self.open_button = ttk.Button(button_frame, text=" Görüntüle", image=self.icon_edit, compound="left", command=self.open_note_prompt, style='Accent.TButton')
        self.open_button.pack(side=LEFT, expand=True, fill=tk.X, padx=(0, 5))

        self.delete_button = ttk.Button(button_frame, text=" Sil", image=self.icon_delete, compound="left", command=self.delete_note_prompt, style='TButton')
        self.delete_button.pack(side=LEFT, expand=True, fill=tk.X, padx=(5, 0))

        self.show_new_note_view()
        self.load_notes()
        self.current_note_password = None
        self.active_password_entry = None
        self.password_error_label = None 

    def load_icons(self):
        try:
            # Her bir dosya yolunu resource_path() içine alın
            self.icon_edit = tk.PhotoImage(file=resource_path("icons/edit.png"))
            self.icon_delete = tk.PhotoImage(file=resource_path("icons/delete.png"))
            self.icon_save = tk.PhotoImage(file=resource_path("icons/save.png"))
            self.icon_back = tk.PhotoImage(file=resource_path("icons/back.png"))
        except tk.TclError:
            print("İkon dosyaları 'icons' klasöründe bulunamadı. Butonlar metin olarak görünecek.")
            self.icon_edit = tk.PhotoImage()
            self.icon_delete = tk.PhotoImage()
            self.icon_save = tk.PhotoImage()
            self.icon_back = tk.PhotoImage()

    def setup_styles(self):
        self.COLOR_BACKGROUND = "#2E3440"; self.COLOR_WIDGET_BG = "#3B4252"; self.COLOR_FRAME = "#434C5E"
        self.COLOR_TEXT = "#ECEFF4"; self.COLOR_ACCENT = "#5E81AC"; self.COLOR_ACCENT_ACTIVE = "#81A1C1"
        self.COLOR_SUCCESS = "#A3BE8C"; self.COLOR_ERROR = "#BF616A"
        self.FONT_DEFAULT = ("Segoe UI", 11); self.FONT_HEADER = ("Segoe UI", 16, "bold")
        self.FONT_BUTTON_BOLD = ("Segoe UI", 11, "bold"); self.FONT_LISTBOX = ("Segoe UI", 13)

        style = ttk.Style(self.root)
        self.root.configure(bg=self.COLOR_BACKGROUND)
        style.theme_use('clam')
        
        style.configure("TTreeview", background=self.COLOR_WIDGET_BG, fieldbackground=self.COLOR_WIDGET_BG, foreground=self.COLOR_TEXT, 
                        rowheight=45, font=self.FONT_LISTBOX, borderwidth=0)
        style.map('TTreeview', background=[('selected', self.COLOR_ACCENT)], foreground=[('selected', self.COLOR_TEXT)])
        style.configure("Notes.TTreeview", borderwidth=0)
        style.layout("Notes.TTreeview", [('Treeview.treearea', {'sticky': 'nswe'})]) 
        
        style.configure('TFrame', background=self.COLOR_FRAME); style.configure('App.TFrame', background=self.COLOR_BACKGROUND)
        style.configure('TLabel', background=self.COLOR_BACKGROUND, foreground=self.COLOR_TEXT, font=self.FONT_DEFAULT)
        style.configure('Header.TLabel', background=self.COLOR_BACKGROUND, foreground=self.COLOR_TEXT, font=self.FONT_HEADER)
        
        style.configure('Error.TLabel', background=self.COLOR_BACKGROUND, foreground=self.COLOR_ERROR, font=self.FONT_DEFAULT)

        style.configure('TEntry', fieldbackground=self.COLOR_WIDGET_BG, foreground=self.COLOR_TEXT, insertcolor=self.COLOR_TEXT, borderwidth=1, bordercolor=self.COLOR_FRAME, padding=(10, 8))
        style.map('TEntry', bordercolor=[('focus', self.COLOR_ACCENT)])
        
        style.configure('Error.TEntry', fieldbackground='#D08770', foreground=self.COLOR_TEXT, insertcolor=self.COLOR_TEXT, borderwidth=1, padding=(10, 8))
        style.map('Error.TEntry', bordercolor=[('focus', self.COLOR_ERROR)])

        style.configure('TButton', background=self.COLOR_WIDGET_BG, foreground=self.COLOR_TEXT, font=self.FONT_BUTTON_BOLD, padding=12, borderwidth=0)
        style.map('TButton', background=[('active', self.COLOR_ACCENT_ACTIVE), ('!disabled', self.COLOR_WIDGET_BG)])
        style.configure('Accent.TButton', background=self.COLOR_ACCENT, foreground=self.COLOR_TEXT, font=self.FONT_BUTTON_BOLD)
        style.map('Accent.TButton', background=[('active', self.COLOR_ACCENT_ACTIVE), ('!disabled', self.COLOR_ACCENT)])
        
        style.configure('Status.TLabel', background=self.COLOR_WIDGET_BG, foreground=self.COLOR_TEXT, font=("Segoe UI", 10))
        style.configure('ErrorStatus.TLabel', background=self.COLOR_ERROR, foreground=self.COLOR_TEXT, font=("Segoe UI", 10, "bold"))
        
        style.layout('Modern.Vertical.TScrollbar', [('Vertical.Scrollbar.trough', {'children': [('Vertical.Scrollbar.thumb', {'expand': '1', 'sticky': 'nswe'})], 'sticky': 'ns'})])
        style.configure('Modern.Vertical.TScrollbar', gripborderwidth=0, borderwidth=0, background=self.COLOR_WIDGET_BG, troughcolor=self.COLOR_BACKGROUND, bordercolor=self.COLOR_BACKGROUND, arrowcolor=self.COLOR_TEXT)
        style.map('Modern.Vertical.TScrollbar', background=[('active', self.COLOR_ACCENT_ACTIVE), ('!active', self.COLOR_ACCENT)])

    def update_scrollbar_visibility(self):
        self.root.update_idletasks()
        if self.tree.yview()[1] < 1.0:
            self.scrollbar.pack(side=RIGHT, fill=Y)
        else:
            self.scrollbar.pack_forget()

    def load_notes(self):
        for i in self.tree.get_children():
            self.tree.delete(i)
        
        if os.path.exists(NOTES_FILE):
            with open(NOTES_FILE, 'r') as f:
                try: self.notes = json.load(f)
                except json.JSONDecodeError: self.notes = []
        else: self.notes = []
        
        for i, note in enumerate(self.notes):
            title = note.get('title', f'İsimsiz Not {i + 1}')
            self.tree.insert(parent="", index='end', iid=i, text=f" {title}")
        
        self.update_scrollbar_visibility()
        
    def show_new_note_view(self):
        self.clear_action_frame()
        ttk.Label(self.action_frame, text="Yeni Not Oluştur", style='Header.TLabel').pack(pady=(0, 20), anchor="w")
        
        ttk.Label(self.action_frame, text="Not Başlığı", style='TLabel').pack(anchor="w", pady=(0, 5))
        title_entry = PlaceholderEntry(self.action_frame, "Örn: Proje Fikirleri", style='TEntry', font=self.FONT_DEFAULT)
        title_entry.pack(fill=tk.X, pady=(0, 15))
        
        ttk.Label(self.action_frame, text="Not İçeriği", style='TLabel').pack(anchor="w", pady=(0, 5))
        note_text_frame = ttk.Frame(self.action_frame, style='TFrame')
        note_text_frame.pack(expand=True, fill=BOTH, pady=0)
        note_text_frame.config(borderwidth=1, relief="solid")
        style = ttk.Style()
        style.configure("Border.TFrame", background=self.COLOR_WIDGET_BG)
        note_text_frame.config(style="Border.TFrame")
        note_text = Text(note_text_frame, height=8, wrap=tk.WORD, bg=self.COLOR_WIDGET_BG, fg=self.COLOR_TEXT, font=self.FONT_DEFAULT, borderwidth=0, highlightthickness=0, insertbackground=self.COLOR_TEXT, selectbackground=self.COLOR_ACCENT, relief="flat", padx=10, pady=10)
        note_text.pack(expand=True, fill=BOTH)

        ttk.Label(self.action_frame, text="Not Şifresi", style='TLabel').pack(anchor="w", pady=(15, 5))
        password_entry = PlaceholderEntry(self.action_frame, "Notu korumak için bir şifre belirleyin", show="*", style='TEntry', font=self.FONT_DEFAULT)
        password_entry.pack(fill=tk.X, pady=(0, 20))
        
        password_entry.bind('<Return>', lambda event: self.save_note(title_entry.get(), note_text.get("1.0", END), password_entry.get()))

        save_button = ttk.Button(self.action_frame, text=" Notu Güvenle Kaydet", image=self.icon_save, compound="left", command=lambda: self.save_note(title_entry.get(), note_text.get("1.0", END), password_entry.get()), style='Accent.TButton')
        save_button.pack(fill=tk.X, ipady=5)

    
    def show_password_prompt_view(self, note_index, action_callback):
        self.clear_action_frame()
        note_name = self.tree.item(note_index)['text'].strip()
        ttk.Label(self.action_frame, text=f"'{note_name}' için Şifre", style='Header.TLabel').pack(pady=(0, 20), anchor="w")
        ttk.Label(self.action_frame, text="Lütfen devam etmek için notun şifresini girin:", style='TLabel').pack(anchor="w", pady=(10, 5))
        
        password_entry = PlaceholderEntry(self.action_frame, "Not şifresini buraya girin", show="*", style='TEntry', font=self.FONT_DEFAULT)
        password_entry.pack(fill=tk.X, pady=5)
        password_entry.focus()
        self.active_password_entry = password_entry
        
        password_entry.bind('<Return>', lambda event: action_callback(note_index, password_entry.get()))
        
        button_container = ttk.Frame(self.action_frame, style='App.TFrame')
        button_container.pack(fill='x', pady=(15,0))
        button_container.columnconfigure((0, 1), weight=1)
        submit_button = ttk.Button(button_container, text="Onayla", command=lambda: action_callback(note_index, password_entry.get()), style='Accent.TButton')
        submit_button.grid(row=0, column=0, sticky="ew", padx=(0, 5))
        back_button = ttk.Button(button_container, text=" Geri Dön", image=self.icon_back, compound="left", command=self.show_new_note_view, style='TButton')
        back_button.grid(row=0, column=1, sticky="ew", padx=(5, 0))

        
        self.password_error_label = ttk.Label(self.action_frame, text="", style='Error.TLabel', anchor="center")
        self.password_error_label.pack(fill='x', pady=(10, 0))

    def show_delete_confirmation_view(self, note_index):
        self.clear_action_frame()
        note_name = self.tree.item(note_index)['text'].strip()
        ttk.Label(self.action_frame, text="Silme Onayı", style='Header.TLabel').pack(pady=(0, 10), anchor="w")
        warning_text = f"'{note_name}' notunu kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz."
        ttk.Label(self.action_frame, text=warning_text, style='TLabel', wraplength=400).pack(anchor="w", pady=20)
        
        button_container = ttk.Frame(self.action_frame, style='App.TFrame'); button_container.pack(fill='x', pady=10)
        button_container.columnconfigure((0,1), weight=1)

        delete_button = ttk.Button(button_container, text=" Evet, Sil", image=self.icon_delete, compound="left", command=lambda: self.execute_delete(note_index))
        style = ttk.Style(); style.configure("Delete.TButton", background=self.COLOR_ERROR, foreground=self.COLOR_TEXT, font=self.FONT_BUTTON_BOLD, padding=12); 
        style.map('Delete.TButton', background=[('active', '#D08770')]); delete_button.configure(style="Delete.TButton")
        delete_button.grid(row=0, column=0, sticky="ew", padx=(0, 5))
        
        delete_button.focus_set()
        delete_button.bind('<Return>', lambda event: self.execute_delete(note_index))
        
        cancel_button = ttk.Button(button_container, text="Hayır, İptal Et", command=self.show_new_note_view, style='TButton')
        cancel_button.grid(row=0, column=1, sticky="ew", padx=(5, 0))

    def open_note_prompt(self, event=None):
        selected_item = self.tree.selection()
        if not selected_item:
            self.show_status_message("Lütfen bir not seçin.", "error")
            return
        note_index = int(selected_item[0])
        self.show_password_prompt_view(note_index, self.process_open_note)

    def delete_note_prompt(self):
        selected_item = self.tree.selection()
        if not selected_item:
            self.show_status_message("Lütfen silmek için bir not seçin.", 'error'); return
        note_index = int(selected_item[0])
        self.show_password_prompt_view(note_index, self.process_delete_password_check)

    def clear_action_frame(self):
        for widget in self.action_frame.winfo_children(): widget.destroy()
        self.action_frame.columnconfigure(0, weight=0); self.action_frame.rowconfigure(0, weight=0); self.action_frame.rowconfigure(1, weight=0); self.action_frame.rowconfigure(2, weight=0)
        self.active_password_entry = None
        self.password_error_label = None  

    def show_note_content_view(self, note_index, decrypted_text):
        self.clear_action_frame(); self.action_frame.rowconfigure(1, weight=1); self.action_frame.columnconfigure(0, weight=1)
        note_title = self.notes[note_index].get('title', f'Not {note_index + 1}')
        ttk.Label(self.action_frame, text=f"'{note_title}' İçeriğini Düzenle", style='Header.TLabel').grid(row=0, column=0, sticky="w", pady=(0, 15))
        text_widget = Text(self.action_frame, wrap=tk.WORD, font=self.FONT_DEFAULT, bg=self.COLOR_WIDGET_BG, fg=self.COLOR_TEXT, padx=10, pady=10, borderwidth=0, highlightthickness=0, insertbackground=self.COLOR_TEXT, selectbackground=self.COLOR_ACCENT); text_widget.grid(row=1, column=0, sticky="nsew", pady=5); text_widget.insert(END, decrypted_text)
        button_container = ttk.Frame(self.action_frame, style='App.TFrame'); button_container.grid(row=2, column=0, sticky="ew", pady=(15,0)); button_container.columnconfigure((0, 1), weight=1)
        save_button = ttk.Button(button_container, text=" Değişiklikleri Kaydet", image=self.icon_save, compound="left", command=lambda: self.save_edited_note(note_index, text_widget.get("1.0", END)), style='Accent.TButton'); save_button.grid(row=0, column=0, sticky="ew", padx=(0, 5))
        back_button = ttk.Button(button_container, text=" Geri Dön", image=self.icon_back, compound="left", command=self.show_new_note_view, style='TButton'); back_button.grid(row=0, column=1, sticky="ew", padx=(5, 0))
    
    def flash_widget_error(self, widget, original_style='TEntry'):
        if widget and widget.winfo_exists():
            widget.configure(style='Error.TEntry')
            self.root.after(800, lambda: widget.configure(style=original_style))
    
    def show_status_message(self, message, level='info'):
        colors = {'info': self.COLOR_TEXT, 'success': self.COLOR_SUCCESS, 'error': self.COLOR_TEXT}
        if level == 'error':
            self.status_label.config(style='ErrorStatus.TLabel')
        else:
            self.status_label.config(style='Status.TLabel')
            
        self.status_label.config(text=message, foreground=colors.get(level, self.COLOR_TEXT))
        self.root.after(5000, lambda: (
            self.status_label.config(text=""),
            self.status_label.config(style='Status.TLabel')
        ))
    
    def save_note(self, title, note_content, password):
        if title == "Örn: Proje Fikirleri": title = ""
        if password == "Notu korumak için bir şifre belirleyin": password = ""
        title = title.strip()
        if not title or not password: 
            self.show_status_message("Başlık ve şifre alanları doldurulmalıdır. İçerik boş olabilir.", 'error')
            return
        encrypted_data = encrypt_note(note_content.strip(), password) 
        note_to_save = {'title': title, 'salt': encrypted_data['salt'], 'data': encrypted_data['data']}
        
        self.notes.append(note_to_save)
        with open(NOTES_FILE, 'w') as f: 
            json.dump(self.notes, f, indent=4)
            
        self.show_new_note_view()
        self.show_status_message(f"'{title}' notu başarıyla kaydedildi!", 'success')
        self.load_notes()
    
   
    def process_open_note(self, note_index, password):
        if self.password_error_label: self.password_error_label.config(text="")
        if not password or password == "Not şifresini buraya girin": 
            if self.password_error_label: self.password_error_label.config(text="Şifre alanı boş bırakılamaz.")
            self.flash_widget_error(self.active_password_entry)
            return
            
        encrypted_note = self.notes[note_index]
        decrypted_text = decrypt_note(encrypted_note, password)
        if decrypted_text is not None:
            self.current_note_password = password
            self.show_note_content_view(note_index, decrypted_text)
            note_title = self.notes[note_index].get('title', f'Not {note_index + 1}')
            self.show_status_message(f"'{note_title}' notu görüntülendi.", "info")
        else: 
            self.current_note_password = None
            if self.password_error_label: self.password_error_label.config(text="Yanlış şifre! Lütfen tekrar deneyin.")
            self.flash_widget_error(self.active_password_entry)
    
    
    def process_delete_password_check(self, note_index, password):
        if self.password_error_label: self.password_error_label.config(text="") 
        if not password or password == "Not şifresini buraya girin": 
            if self.password_error_label: self.password_error_label.config(text="Şifre alanı boş bırakılamaz.")
            self.flash_widget_error(self.active_password_entry)
            return

        encrypted_note = self.notes[note_index]
        if decrypt_note(encrypted_note, password) is not None: 
            self.show_delete_confirmation_view(note_index)
        else: 
            if self.password_error_label: self.password_error_label.config(text="Yanlış şifre! Not silinemedi.")
            self.flash_widget_error(self.active_password_entry)
            
    def save_edited_note(self, note_index, new_content):
        new_content = new_content.strip(); password = self.current_note_password
        if not password: self.show_status_message("Şifre bulunamadı. Lütfen notu tekrar açın.", 'error'); self.show_new_note_view(); return
        title = self.notes[note_index]['title']; encrypted_data = encrypt_note(new_content, password)
        updated_note = {'title': title, 'salt': encrypted_data['salt'], 'data': encrypted_data['data']}
        self.notes[note_index] = updated_note
        with open(NOTES_FILE, 'w') as f: json.dump(self.notes, f, indent=4)
        self.show_status_message(f"'{title}' notu başarıyla güncellendi!", 'success'); self.load_notes(); self.show_new_note_view(); self.current_note_password = None
    
    def execute_delete(self, note_index):
        note_title = self.notes[note_index].get('title', f'Not {note_index + 1}'); self.notes.pop(note_index)
        with open(NOTES_FILE, 'w') as f: json.dump(self.notes, f, indent=4)
        self.load_notes(); self.show_status_message(f"'{note_title}' notu kalıcı olarak silindi.", 'success'); self.show_new_note_view()

if __name__ == "__main__":
    root = tk.Tk()
    app = EncryptedNoteApp(root)
    root.mainloop()