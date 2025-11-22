# Unraid Community Apps Submission Guide

This document explains how to submit AI Chief of Staff to Unraid Community Apps.

## Prerequisites

1. GitHub repository must be public
2. Template XML file must be accessible via raw GitHub URL
3. Icon PNG file must be accessible via raw GitHub URL
4. Application must be thoroughly tested on Unraid

## Files for Submission

All files are in the `unraid/` directory:

- `ai-chief-of-staff.xml` - Unraid template
- `icon.png` - Application icon (512x512)
- `README.md` - User documentation

## Submission Process

### Step 1: Fork the Repository

Fork the official Community Applications repository:
```
https://github.com/Squidly271/Community-Applications-Moderators
```

### Step 2: Add Template to Your Fork

1. Clone your fork
2. Create a new branch: `git checkout -b add-ai-chief-of-staff`
3. Add the template XML to the appropriate category directory
4. Commit: `git commit -m "Add AI Chief of Staff template"`
5. Push: `git push origin add-ai-chief-of-staff`

### Step 3: Create Pull Request

1. Go to your forked repository on GitHub
2. Click "Pull Request"
3. Title: "Add AI Chief of Staff - AI-Powered Executive Assistant"
4. Description:
   ```
   Adding AI Chief of Staff to Community Apps.
   
   Application: AI-powered executive assistant
   Category: Productivity / Tools
   Repository: https://github.com/JoshuaSeidel/plaud-ai-chief-of-staff
   Template URL: https://raw.githubusercontent.com/JoshuaSeidel/plaud-ai-chief-of-staff/main/unraid/ai-chief-of-staff.xml
   Icon URL: https://raw.githubusercontent.com/JoshuaSeidel/plaud-ai-chief-of-staff/main/unraid/icon.png
   
   Features:
   - Automatic meeting transcript processing
   - AI-powered task extraction
   - Google Calendar integration
   - Weekly executive briefs
   - Push notifications
   - PWA support
   
   Requirements:
   - Anthropic API key
   - PostgreSQL database (recommended) or SQLite
   
   Tested on: Unraid 6.12+
   ```

### Step 4: Wait for Review

Moderators will review your submission. They may request changes.

## Alternative: Manual Installation URL

Until accepted into Community Apps, users can install manually:

```
Template URL: https://raw.githubusercontent.com/JoshuaSeidel/plaud-ai-chief-of-staff/main/unraid/ai-chief-of-staff.xml
```

Users add this in: **Docker → Add Container → Template repositories**

## Template Validation Checklist

Before submitting, verify:

- [x] XML is well-formed and valid
- [x] All URLs are accessible (template, icon, support, project)
- [x] Icon is PNG format, 512x512 or larger
- [x] Overview describes the application clearly
- [x] Category is appropriate (Productivity/Tools)
- [x] All required configs have sensible defaults
- [x] Support and Project URLs point to GitHub
- [x] Template tested on actual Unraid installation
- [x] Documentation is complete (README.md)

## Template URL Structure

```
https://raw.githubusercontent.com/[USERNAME]/[REPO]/[BRANCH]/unraid/ai-chief-of-staff.xml
```

For this project:
```
https://raw.githubusercontent.com/JoshuaSeidel/plaud-ai-chief-of-staff/main/unraid/ai-chief-of-staff.xml
```

## Icon Requirements

- Format: PNG
- Size: 512x512 pixels (minimum)
- Transparency: Supported
- File size: < 1MB
- URL must be direct raw GitHub link

Current icon URL:
```
https://raw.githubusercontent.com/JoshuaSeidel/plaud-ai-chief-of-staff/main/unraid/icon.png
```

## Testing Checklist

Before submitting, test the template:

- [ ] Container starts successfully
- [ ] WebUI is accessible
- [ ] SQLite mode works
- [ ] PostgreSQL connection works
- [ ] Configuration persists across restarts
- [ ] Updates work correctly
- [ ] Logs are accessible
- [ ] All environment variables work
- [ ] SWAG integration works
- [ ] Documentation is accurate

## Support After Submission

After acceptance:

1. Monitor GitHub issues for Unraid-specific problems
2. Update template if breaking changes occur
3. Maintain documentation
4. Respond to user questions on Unraid forums

## Resources

- **Community Apps Repo**: https://github.com/Squidly271/Community-Applications-Moderators
- **Template Guidelines**: https://forums.unraid.net/topic/38619-docker-faq/
- **Unraid Docker Guide**: https://wiki.unraid.net/Docker_Management

## Questions?

Post questions about Community Apps submission in:
- Unraid Forums: https://forums.unraid.net/forum/55-docker-containers/
- Community Apps Moderators: https://github.com/Squidly271/Community-Applications-Moderators/issues

