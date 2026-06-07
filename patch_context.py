import re

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import useLanguage
if "import { useLanguage }" not in content:
    content = content.replace(
        "import { getTranslation } from './i18n';",
        "import { useLanguage } from './LanguageContext';"
    )

# 2. Remove broken language state from LoginModal
content = content.replace("const [language, setLanguage] = useState('zh');\n\n  // Change language automatically based on region on first load\n  useEffect(() => {\n    setLanguage(region === 'asia' ? 'zh' : 'en');\n  }, [region]);\n\n  const t = (key) => getTranslation(language, key);", "")

# 3. Inject useLanguage hook into components
components = [
    r'(const LoginModal = [^{]+\{)',
    r'(const DonateBanner = [^{]+\{)',
    r'(const GlobalEventBanner = [^{]+\{)',
    r'(const App = [^{]+\{)',
    r'(const MainApp = [^{]+\{)'
]

for pattern in components:
    def repl(m):
        # Prevent double injection
        if 'useLanguage();' in content[m.end():m.end()+100]:
            return m.group(1)
        return m.group(1) + "\n  const { t, language, setLanguage } = useLanguage();"
    content = re.sub(pattern, repl, content, count=1)

with open('client/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed App.jsx Context references!")
