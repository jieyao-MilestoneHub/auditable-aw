---
description: Check collaboration status across all roles
allowed-tools: Read, Glob, Grep
argument-hint:
---

# Sync Status Check

Check the current collaboration status across all roles.

## Steps

1. **Check Active Locks**
   Read `.aaw/locks/` to see if any resources are locked

2. **Check Pending Requests**
   - `.aaw/requests/frontend/` - Frontend's pending requests
   - `.aaw/requests/backend/` - Backend's pending requests

3. **Check Notifications**
   - `.aaw/notifications/` - Pending notifications
   - `.aaw/notifications/breaking/` - Breaking change alerts

4. **Check Acknowledgments**
   - `.aaw/acks/frontend/` - Frontend acknowledgments
   - `.aaw/acks/backend/` - Backend acknowledgments

5. **Report Status**

Output format:
```
## Collaboration Status

### Active Locks
- [lock name]: [holder] - [reason]

### Pending Requests
Frontend:
- [request summary]
Backend:
- [request summary]

### Awaiting Acknowledgment
- [notification]: waiting for [roles]

### Recent Activity
- [timestamp]: [action]
```

## Usage

Run this command to understand current state before making changes.
Any role can run this command.
