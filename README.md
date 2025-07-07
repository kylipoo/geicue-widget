# Geicue Widget - Setup Guide

````env
# Sentry configuration
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENV=development

# OpenAI / LLM configuration
OPENAI_API_KEY=sk-...         # <-- Put your OpenAI API key here, keep it secret!
BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4

# Sentry API integration for feedback analysis
SENTRY_API_TOKEN=your_sentry_api_token_here
SENTRY_ORG_SLUG=your_sentry_org_slug
SENTRY_PROJECT_SLUG=your_sentry_project_slug

## Prerequisites

- **Python 3.9+**
  Install via Homebrew (macOS):

  ```sh
  brew install python
````

- **Node.js & npm**  
  (If you plan to work with the frontend, ensure Node.js and npm are installed.)

---

## 1. Clone the Repository

```sh
git clone git@github-personal:kylipoo/geicue-widget.git
cd geicue-widget
```

---

## 2. Python Environment Setup

### a. (Optional) Create a Virtual Environment

```sh
python3 -m venv geicue-env
source geicue-env/bin/activate
```

### b. Install Python Dependencies

Go to the backend directory:

```sh
cd backend
```

Install required packages:

```sh
pip install --upgrade pip
pip install -r requirements.txt
```

If you see a `ModuleNotFoundError` for `sentry_sdk`, install it:

```sh
pip install sentry_sdk
```

---

## 3. Add Python User Scripts to PATH

Some dependencies install scripts to a user directory not in your PATH.  
Add this to your `~/.zshrc` (or `~/.bashrc`):

```sh
export PATH="$PATH:/Users/<your-username>/Library/Python/3.9/bin"
```

Replace `<your-username>` with your actual username.

Reload your shell:

```sh
source ~/.zshrc
```

---

## 4. Start the Backend

From the `backend` directory, run:

```sh
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Or, if you prefer:

```sh
python3 app.py
```

---

## 5. (Optional) Jupyter & Langchain Setup

If you need Jupyter and Langchain for development:

```sh
pip3 install jupyterlab langgraph langchain langchain_openai openai langsmith pydantic typing_extensions
python3 -m pip install --upgrade pip
```

---

## 6. GitHub SSH Setup (No VPN Required)

Generate SSH keys (if you haven’t already):

```sh
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_personal
ssh-add ~/.ssh/id_ed25519_personal
pbcopy < ~/.ssh/id_ed25519_personal.pub
```

Add the copied public key to your GitHub account.

---

## 7. (Optional) Cursor Network Proxy Fix

If you use Cursor and have network issues:

1. Press `Ctrl+Shift+P`
2. Open User Settings
3. Search for "network"
4. Edit `settings.json`
5. Add:
   ```json
   "http.proxy": "http://127.0.0.1:9000/",
   "cursor.general.disableHttp2": true
   ```
6. Save and restart Cursor

---

## Troubleshooting

- If you see warnings about OpenSSL/LibreSSL, you can generally ignore them unless you encounter SSL errors.
- If a Python package is missing, install it with `pip install <package-name>`.

---

**You're all set!**  
If you have any issues, please check the error messages and ensure all dependencies are installed.
If you have any issues, please check the error messages and ensure all dependencies are installed.
