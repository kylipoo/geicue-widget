"""
AI Analysis Engine for Sentry Events
- Fetches real Sentry events using Sentry API
- Auto-tags each event (theme, severity, urgency)
- Updates Sentry issue (group) tags via Sentry API
- Sends Slack alert for high urgency

.env requirements:
SENTRY_API_TOKEN=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
SENTRY_ORG_SLUG=personal-hackathon
SENTRY_PROJECT_SLUG=feedback
"""
import os
import requests
from dotenv import load_dotenv
import openai
from datetime import datetime, timedelta, timezone
load_dotenv()

def fetch_sentry_events():
    SENTRY_API_TOKEN = os.getenv("SENTRY_API_TOKEN")
    SENTRY_ORG_SLUG = os.getenv("SENTRY_ORG_SLUG")
    SENTRY_PROJECT_SLUG = os.getenv("SENTRY_PROJECT_SLUG")
    url = f"https://sentry.io/api/0/projects/{SENTRY_ORG_SLUG}/{SENTRY_PROJECT_SLUG}/events/"
    headers = {"Authorization": f"Bearer {SENTRY_API_TOKEN}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()  # List of event dicts

def update_issue_tags(issue_id, tags):
    """Update Sentry issue (group) tags via Sentry API."""
    SENTRY_API_TOKEN = os.getenv("SENTRY_API_TOKEN")
    url = f"https://sentry.io/api/0/issues/{issue_id}/"
    headers = {
        "Authorization": f"Bearer {SENTRY_API_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "tags": [[k, v] for k, v in tags.items()]
    }
    response = requests.put(url, headers=headers, json=data)
    if response.status_code == 200:
        print(f"Updated tags for issue {issue_id}: {tags}")
    else:
        print(f"Failed to update tags for issue {issue_id}: {response.text}")

def ai_tag_feedback(feedback_text):
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    prompt = f"""
    Analyze the following customer feedback and assign:
    - theme (e.g., bug, feature, ui, performance, billing, other)
    - severity (low, medium, high)
    - urgency (low, medium, high)
    Feedback: \"{feedback_text}\"
    Respond in JSON: {{\"theme\": \"...\", \"severity\": \"...\", \"urgency\": \"...\"}}
    """
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        import json
        tags = json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI tagging failed: {e}")
        tags = {"theme": "other", "severity": "low", "urgency": "low"}
    return tags

def auto_tag(event):
    """AI logic: tag based on customer feedback using OpenAI."""
    feedback = event.get("extra", {}).get("details") or event.get("message", "")
    return ai_tag_feedback(feedback)

def send_slack_alert(event, tags):
    # Placeholder for Slack integration
    print(f"[SLACK ALERT] Urgent issue detected: {event.get('message')} | Tags: {tags}")

def is_recent_event(event, minutes=5):
    date_str = event.get("dateCreated") or event.get("timestamp")
    if not date_str:
        return False
    try:
        # Remove 'Z' and parse as UTC
        if date_str.endswith('Z'):
            date_str = date_str[:-1]
        event_time = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        return now - event_time <= timedelta(minutes=minutes)
    except Exception as e:
        print(f"Failed to parse event time: {e}")
        return False

def process_sentry_logs():
    sentry_events = fetch_sentry_events()
    recent_events = [event for event in sentry_events if is_recent_event(event, minutes=5)]
    for event in recent_events:
        print("\n--- Sentry Event ---\n", event)  # Print event for debugging group/issue ID
        tags = auto_tag(event)
        print(f"Event {event.get('event_id')} tags: {tags}")
        # Try to get the issue/group ID
        issue_id = event.get("groupID") or event.get("group") or event.get("issue") or event.get("issue_id")
        if issue_id:
            update_issue_tags(issue_id, tags)
        else:
            print("No issue/group ID found for event.")
        if tags["urgency"] == "high":
            send_slack_alert(event, tags)
    print("Processing complete.")

if __name__ == "__main__":
    process_sentry_logs() 