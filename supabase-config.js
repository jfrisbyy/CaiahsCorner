/* =========================================================
   SUPABASE CONFIG  ← PASTE YOUR TWO VALUES HERE
   ---------------------------------------------------------
   Find them in Supabase → Project Settings → API:
     • Project URL      (e.g. https://abcdxyz.supabase.co)
     • anon / public key (the long "anon" JWT — NOT the service_role key)

   Until both are filled in, the app runs in localStorage-only
   mode (works offline, nothing is synced). Fill them in and
   reload to turn the real backend on.
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: "https://nttsnwzfohqrxmeppudp.supabase.co",      // ← paste Project URL
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dHNud3pmb2hxcnhtZXBwdWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzEyMzYsImV4cCI6MjA5NTY0NzIzNn0.ad4ONGQhNly7FJrHiyQFPivW93vTWNTcAFp3DjIQdPA",  // ← paste anon public key
};
