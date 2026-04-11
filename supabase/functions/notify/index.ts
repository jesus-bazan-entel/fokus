import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
// Infobip WhatsApp
const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY") || "";
const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL") || "";
const INFOBIP_WHATSAPP_FROM = Deno.env.get("INFOBIP_WHATSAPP_FROM") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface UserSettings {
  user_id: string;
  phone: string | null;
  due_soon_days: number;
  notify_email: boolean;
  notify_whatsapp: boolean;
  notify_overdue: boolean;
  notify_due_today: boolean;
  notify_due_soon: boolean;
}

interface TaskAlert {
  title: string;
  project_name: string;
  due_date: string;
  level: "overdue" | "due_today" | "due_soon";
  days: number;
}

function formatDays(days: number): string {
  if (days < 0) return `vencida hace ${Math.abs(days)} dia(s)`;
  if (days === 0) return "vence hoy";
  return `vence en ${days} dia(s)`;
}

function buildEmailHtml(userName: string, alerts: TaskAlert[]): string {
  const overdue = alerts.filter((a) => a.level === "overdue");
  const dueToday = alerts.filter((a) => a.level === "due_today");
  const dueSoon = alerts.filter((a) => a.level === "due_soon");

  const renderGroup = (title: string, color: string, items: TaskAlert[]) => {
    if (items.length === 0) return "";
    const rows = items
      .map(
        (a) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${a.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${a.project_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${color};font-weight:600">${formatDays(a.days)}</td>
      </tr>`
      )
      .join("");
    return `
      <h3 style="color:${color};margin:20px 0 8px">${title} (${items.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#f8fafc">
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e5e7eb">Tarea</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e5e7eb">Proyecto</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e5e7eb">Estado</th>
        </tr>
        ${rows}
      </table>`;
  };

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#4338CA,#6366f1);padding:24px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">Fokus</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">Resumen de alertas de tareas</p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#374151;font-size:14px">Hola <strong>${userName}</strong>, tienes <strong>${alerts.length}</strong> tarea(s) que requieren tu atencion:</p>
        ${renderGroup("Tareas vencidas", "#ef4444", overdue)}
        ${renderGroup("Vencen hoy", "#f59e0b", dueToday)}
        ${renderGroup("Por vencer", "#3b82f6", dueSoon)}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center">
          Este es un correo automatico de Fokus. Puedes configurar tus preferencias de notificacion en Settings.
        </p>
      </div>
    </div>`;
}

function buildWhatsAppMessage(userName: string, alerts: TaskAlert[]): string {
  const lines = [`*Fokus - Alertas de tareas*\n\nHola ${userName}, tienes ${alerts.length} alerta(s):\n`];

  const overdue = alerts.filter((a) => a.level === "overdue");
  const dueToday = alerts.filter((a) => a.level === "due_today");
  const dueSoon = alerts.filter((a) => a.level === "due_soon");

  if (overdue.length > 0) {
    lines.push(`\n🔴 *Vencidas (${overdue.length})*`);
    overdue.forEach((a) => lines.push(`  - ${a.title} (${a.project_name}) - ${formatDays(a.days)}`));
  }
  if (dueToday.length > 0) {
    lines.push(`\n🟡 *Vencen hoy (${dueToday.length})*`);
    dueToday.forEach((a) => lines.push(`  - ${a.title} (${a.project_name})`));
  }
  if (dueSoon.length > 0) {
    lines.push(`\n🔵 *Por vencer (${dueSoon.length})*`);
    dueSoon.forEach((a) => lines.push(`  - ${a.title} (${a.project_name}) - ${formatDays(a.days)}`));
  }

  return lines.join("\n");
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set, skipping email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Fokus <notifications@fokus.apolonext.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Email to ${to} failed:`, err);
  } else {
    console.log(`Email sent to ${to}`);
  }
}

async function sendWhatsApp(to: string, message: string) {
  if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
    console.log("Infobip credentials not set, skipping WhatsApp");
    return;
  }

  // Clean phone number: remove spaces, ensure starts with country code
  const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^(\+)/, "");
  const url = `https://${INFOBIP_BASE_URL}/whatsapp/1/message/text`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: INFOBIP_WHATSAPP_FROM,
      to: cleanPhone,
      content: {
        text: message,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`WhatsApp to ${to} failed:`, err);
  } else {
    console.log(`WhatsApp sent to ${to} via Infobip`);
  }
}

async function processUser(settings: UserSettings) {
  // Get user email and name
  const { data: userData } = await supabase.auth.admin.getUserById(settings.user_id);
  if (!userData?.user) return;

  const userName = userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0] || "Usuario";
  const userEmail = userData.user.email;

  // Get user's projects with notification settings
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, notify_enabled, notify_time, notify_days")
    .eq("owner_id", settings.user_id);

  if (!projects || projects.length === 0) return;

  // Filter projects that should be notified right now
  const now = new Date();
  const currentHour = String(now.getUTCHours()).padStart(2, "0");
  const currentMinute = String(now.getUTCMinutes()).padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;
  const currentDay = String(now.getUTCDay()); // 0=Sun, 1=Mon...

  interface ProjectRow {
    id: string;
    name: string;
    notify_enabled: boolean;
    notify_time: string | null;
    notify_days: string[] | null;
  }

  const activeProjects = projects.filter((p: ProjectRow) => {
    if (!p.notify_enabled) return false;
    const projectTime = p.notify_time || "08:00";
    const projectDays = p.notify_days || ["1", "2", "3", "4", "5"];
    // Check if current day is in the project's notify days
    if (!projectDays.includes(currentDay)) return false;
    // Check if current time matches (within 30 min window)
    const [pH, pM] = projectTime.split(":").map(Number);
    const [cH, cM] = currentTime.split(":").map(Number);
    const projectMinutes = pH * 60 + pM;
    const currentMinutes = cH * 60 + cM;
    return Math.abs(currentMinutes - projectMinutes) <= 30;
  });

  if (activeProjects.length === 0) return;

  const projectIds = activeProjects.map((p: ProjectRow) => p.id);
  const projectMap = new Map(activeProjects.map((p: ProjectRow) => [p.id, p.name]));

  // Get active tasks with due dates
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, project_id, due_date, status")
    .in("project_id", projectIds)
    .neq("status", "done")
    .not("due_date", "is", null);

  if (!tasks || tasks.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alerts: TaskAlert[] = [];

  for (const task of tasks) {
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 && settings.notify_overdue) {
      alerts.push({
        title: task.title,
        project_name: projectMap.get(task.project_id) || "Sin proyecto",
        due_date: task.due_date,
        level: "overdue",
        days: diffDays,
      });
    } else if (diffDays === 0 && settings.notify_due_today) {
      alerts.push({
        title: task.title,
        project_name: projectMap.get(task.project_id) || "Sin proyecto",
        due_date: task.due_date,
        level: "due_today",
        days: 0,
      });
    } else if (diffDays > 0 && diffDays <= settings.due_soon_days && settings.notify_due_soon) {
      alerts.push({
        title: task.title,
        project_name: projectMap.get(task.project_id) || "Sin proyecto",
        due_date: task.due_date,
        level: "due_soon",
        days: diffDays,
      });
    }
  }

  if (alerts.length === 0) return;

  // Sort: overdue first
  alerts.sort((a, b) => a.days - b.days);

  const subject = `Fokus: ${alerts.length} tarea(s) requieren atencion`;

  // Send email
  if (settings.notify_email && userEmail) {
    const html = buildEmailHtml(userName, alerts);
    await sendEmail(userEmail, subject, html);
  }

  // Send WhatsApp
  if (settings.notify_whatsapp && settings.phone) {
    const message = buildWhatsAppMessage(userName, alerts);
    await sendWhatsApp(settings.phone, message);
  }

  return { user: userEmail, alerts: alerts.length };
}

Deno.serve(async (req) => {
  try {
    // Verify authorization (cron jobs send the service key)
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${SUPABASE_SERVICE_KEY}`) {
      // Also accept the anon key for manual testing
      const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
      if (authHeader !== `Bearer ${SUPABASE_ANON_KEY}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Get all users with notification settings
    const { data: allSettings } = await supabase
      .from("user_settings")
      .select("*")
      .or("notify_email.eq.true,notify_whatsapp.eq.true");

    if (!allSettings || allSettings.length === 0) {
      return Response.json({ message: "No users with notifications enabled", processed: 0 });
    }

    const results = [];
    for (const settings of allSettings) {
      const result = await processUser(settings as UserSettings);
      if (result) results.push(result);
    }

    return Response.json({
      message: `Notifications processed`,
      processed: results.length,
      details: results,
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
