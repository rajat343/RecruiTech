"""HTML email templates for comm notification DAG."""


def get_email_subject_and_body(notification_type: str, payload: dict) -> tuple[str, str]:
    """Return (subject, html_body) for the given notification type."""
    candidate_name = payload.get("candidate_name", "Candidate")

    if notification_type == "candidate_registered":
        return _registration_email(candidate_name)
    elif notification_type == "candidate_shortlisted":
        return _shortlisted_email(candidate_name, payload)
    elif notification_type == "candidate_rejected":
        return _rejected_email(candidate_name, payload)
    else:
        raise ValueError(f"Unknown notification_type: {notification_type}")


def _base_html(title: str, body_content: str) -> str:
    """Wrap body content in the base HTML shell with dark navy/cyan theme."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1525;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1525;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f1c2e,#1a2c42);padding:32px 40px;text-align:center;border-bottom:2px solid #22d3ee;">
              <h1 style="margin:0;color:#22d3ee;font-size:28px;font-weight:700;letter-spacing:1px;">RecruiTech</h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">AI-Powered Recruitment Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              {body_content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#0f1c2e;padding:24px 40px;text-align:center;border-top:1px solid #334155;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated message from RecruiTech. Please do not reply.</p>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">&copy; 2026 RecruiTech. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _registration_email(candidate_name: str) -> tuple[str, str]:
    subject = "Welcome to RecruiTech!"
    body = f"""
      <h2 style="color:#ffffff;margin:0 0 16px;font-size:22px;">Welcome, {candidate_name}!</h2>
      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Your profile has been successfully created on RecruiTech. You are now part of our
        AI-powered recruitment ecosystem.
      </p>
      <div style="background-color:#0f1c2e;border-radius:8px;padding:24px;border-left:4px solid #22d3ee;margin:0 0 24px;">
        <p style="color:#22d3ee;font-weight:600;margin:0 0 8px;font-size:16px;">What happens next?</p>
        <ul style="color:#94a3b8;margin:0;padding:0 0 0 20px;line-height:1.8;">
          <li>Browse and apply to job openings</li>
          <li>Our AI agents will evaluate your profile</li>
          <li>Recruiters will review your matched applications</li>
        </ul>
      </div>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Best of luck in your job search!</p>
    """
    return subject, _base_html("Welcome to RecruiTech", body)


def _shortlisted_email(candidate_name: str, payload: dict) -> tuple[str, str]:
    job_title = payload.get("job_title", "the position")
    company_name = payload.get("company_name", "")
    company_line = f" at <span style='color:#22d3ee;'>{company_name}</span>" if company_name else ""

    subject = f"Congratulations! You've been shortlisted - {job_title}"
    body = f"""
      <h2 style="color:#ffffff;margin:0 0 16px;font-size:22px;">Great News, {candidate_name}!</h2>
      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
        You have been <span style="color:#10b981;font-weight:700;">shortlisted</span> for an interview.
      </p>
      <div style="background-color:#0f1c2e;border-radius:8px;padding:24px;border-left:4px solid #10b981;margin:0 0 24px;">
        <p style="color:#ffffff;font-weight:600;margin:0 0 8px;font-size:18px;">{job_title}</p>
        {"<p style='color:#94a3b8;margin:0;font-size:14px;'>" + company_line + "</p>" if company_name else ""}
      </div>
      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
        The hiring team was impressed with your profile. Please log in to your RecruiTech
        dashboard to view the interview details and next steps.
      </p>
      <p style="color:#94a3b8;font-size:14px;margin:0;">We wish you all the best!</p>
    """
    return subject, _base_html("Interview Shortlisted", body)


def _rejected_email(candidate_name: str, payload: dict) -> tuple[str, str]:
    from utils.config import FRONTEND_URL

    job_title = payload.get("job_title", "the position")
    company_name = payload.get("company_name", "")
    dashboard_url = f"{FRONTEND_URL}/candidate/home"

    subject = f"Application Update - {job_title}"
    body = f"""
      <h2 style="color:#ffffff;margin:0 0 16px;font-size:22px;">Hi {candidate_name},</h2>
      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Thank you for your interest in the <span style="color:#ffffff;font-weight:600;">{job_title}</span>
        {f'position at <span style="color:#22d3ee;">{company_name}</span>' if company_name else "position"}.
      </p>
      <div style="background-color:#0f1c2e;border-radius:8px;padding:24px;border-left:4px solid #ef4444;margin:0 0 24px;">
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0;">
          After careful consideration, the hiring team has decided to move forward with other candidates
          for this role. This decision does not diminish the value of your skills and experience.
        </p>
      </div>
      <!-- Feedback teaser -->
      <div style="background-color:#0f1c2e;border-radius:8px;padding:24px;border:1px solid #22d3ee;margin:0 0 24px;">
        <p style="color:#22d3ee;font-weight:700;margin:0 0 10px;font-size:17px;">Personalized Growth Insights</p>
        <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 16px;">
          We've prepared personalized feedback based on your application. Discover your strengths
          and explore areas for growth to help you succeed in future opportunities.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background:linear-gradient(135deg,#22d3ee,#06b6d4);border-radius:8px;padding:12px 32px;">
              <a href="{dashboard_url}" style="color:#0a1525;font-weight:700;text-decoration:none;font-size:15px;">
                View My Feedback
              </a>
            </td>
          </tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:16px;line-height:1.6;margin:0 0 24px;">
        We encourage you to continue exploring other opportunities on RecruiTech. New positions
        are posted regularly, and your profile remains active for future matches.
      </p>
      <p style="color:#94a3b8;font-size:14px;margin:0;">We wish you the best in your career journey.</p>
    """
    return subject, _base_html("Application Update", body)
