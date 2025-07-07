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

def auto_tag(event):
    """AI logic: tag based on message content (placeholder)."""
    message = event.get("message", "")
    if "TypeError" in message or "Timeout" in message:
        return {"theme": "bug", "severity": "high", "urgency": "high"}
    else:
        return {"theme": "ui", "severity": "low", "urgency": "low"}

def send_slack_alert(event, tags):
    # Placeholder for Slack integration
    print(f"[SLACK ALERT] Urgent issue detected: {event.get('message')} | Tags: {tags}")

def process_sentry_logs():
    sentry_events = fetch_sentry_events()
    for event in sentry_events:
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