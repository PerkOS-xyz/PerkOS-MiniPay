"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useWalletSession } from "@/app/lib/useWalletSession";
import { useMiniPayHost } from "@/app/lib/useIsMiniPay";
import { translated, useLanguage } from "@/app/lib/i18n";

/**
 * Shown on the `not-allowlisted` gate (PERKOS_PUBLIC_MODE=false). One form,
 * two paths — reuses the SAME shared backend the App uses:
 *   - With an access code  → POST /api/access/redeem-code → instant allowlist,
 *     then reload so the wallet session re-signs-in and lands in the app.
 *   - Without a code        → POST /api/access/request → pending queue an admin
 *     approves in PerkOS-Admin → /access.
 */
export function AccessGate({ address }: { address: string }) {
  const { locale } = useLanguage();
  const tr = (en: string, es: string, pt: string) => translated(locale, en, es, pt);
  const session = useWalletSession();
  const isMiniPayHost = useMiniPayHost();

  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // With a code the user redeems for instant access → email + a valid username
  // (claimed in the shared /usernames registry). Without a code it's the normal
  // request-access flow (email + username + company).
  const hasCode = accessCode.trim().length > 0;
  const usernameValid = /^[a-z0-9_-]{3,20}$/.test(username.trim().toLowerCase());
  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const canSubmit =
    !submitting &&
    emailValid &&
    (hasCode ? usernameValid : username.trim().length > 0 && company.trim().length > 0);

  function copyAddress() {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  async function useDifferentWallet() {
    setLoggingOut(true);
    try {
      await session.logout();
    } catch {
      /* navigate away regardless */
    }
    window.location.assign("/");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (hasCode) {
        const res = await fetch("/api/access/redeem-code", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            code: accessCode.trim(),
            email: email.trim(),
            username: username.trim(),
            company: company.trim() || undefined,
            website: website.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || tr(`Couldn't redeem the code (${res.status}).`, `No se pudo canjear el código (${res.status}).`, `Não foi possível resgatar o código (${res.status}).`));
        }
        // Allowlisted now → full reload so the wallet session re-signs-in and
        // picks up the fresh grant, landing straight in the app.
        window.location.assign("/");
        return;
      }

      const res = await fetch("/api/access/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          email: email.trim(),
          username: username.trim() || undefined,
          company: company.trim() || undefined,
          website: website.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || tr(`Couldn't send your request (${res.status}).`, `No se pudo enviar la solicitud (${res.status}).`, `Não foi possível enviar sua solicitação (${res.status}).`));
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Something went wrong. Try again.", "Algo salió mal. Inténtalo nuevamente.", "Algo deu errado. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = "text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]";
  const inputCls =
    "w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)]";

  if (submitted) {
    return (
      <div className="mt-4 w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center">
        <p className="text-sm font-medium text-emerald-200">{tr("You're on the list", "Estás en la lista", "Você está na lista")}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {tr("We'll review your request and email you when your wallet is approved.", "Revisaremos tu solicitud y te enviaremos un email cuando tu wallet sea aprobada.", "Analisaremos sua solicitação e enviaremos um e-mail quando sua carteira for aprovada.")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
      <p className="text-sm font-medium text-[var(--foreground)]">{tr("Get access", "Obtener acceso", "Obter acesso")}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {tr("Have an access code? Redeem it to enter. No code? Request access and we'll email you.", "¿Tienes un código? Canjéalo para entrar. Si no, solicita acceso y te enviaremos un email.", "Tem um código de acesso? Resgate-o para entrar. Sem código? Solicite acesso e enviaremos um e-mail.")}
      </p>

      <div className="mt-3 flex flex-col gap-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
        <span className={labelCls}>{tr("Your wallet", "Tu wallet", "Sua carteira")}</span>
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 break-all font-mono text-[11px] text-[var(--foreground)]">
            {address}
          </span>
          <button
            type="button"
            onClick={copyAddress}
            className="shrink-0 text-[11px] text-[var(--accent)]"
          >
            {copied ? tr("Copied", "Copiado", "Copiado") : tr("Copy", "Copiar", "Copiar")}
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ag-code" className={labelCls}>
            {tr("Access code (optional)", "Código de acceso (opcional)", "Código de acesso (opcional)")}
          </label>
          <input
            id="ag-code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="PERKOS-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            className={`${inputCls} uppercase`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="ag-email" className={labelCls}>
            Email
          </label>
          <input
            id="ag-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className={inputCls}
          />
          {attempted && !emailValid ? (
            <p className="text-[11px] text-red-300">{tr("Enter a valid email.", "Ingresa un email válido.", "Digite um e-mail válido.")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="ag-username" className={labelCls}>
            {tr("Username", "Usuario", "Nome de usuário")}
          </label>
          <input
            id="ag-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="yourname"
            autoCapitalize="none"
            className={inputCls}
          />
          {attempted && hasCode && !usernameValid ? (
            <p className="text-[11px] text-red-300">{tr("3-20 characters: letters, numbers, _ or -.", "3-20 caracteres: letras, números, _ o -.", "3-20 caracteres: letras, números, _ ou -.")}</p>
          ) : null}
        </div>

        {!hasCode ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="ag-company" className={labelCls}>
              {tr("Business", "Negocio", "Negócio")}
            </label>
            <input
              id="ag-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={tr("Your business name", "Nombre de tu negocio", "Nome do seu negócio")}
              className={inputCls}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="ag-website" className={labelCls}>
            {tr("Website (optional)", "Sitio web (opcional)", "Site (opcional)")}
          </label>
          <input
            id="ag-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[11px] text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting
            ? hasCode
              ? tr("Granting…", "Concediendo…", "Concedendo…")
              : tr("Sending…", "Enviando…", "Enviando…")
            : hasCode
              ? tr("Redeem and enter", "Canjear y entrar", "Resgatar e entrar")
              : tr("Request access", "Solicitar acceso", "Solicitar acesso")}
        </button>
      </form>

      {/* Browser only — the MiniPay webview connects implicitly (its wallet is
          the host), so switching there would just bounce back via AutoConnect. */}
      {isMiniPayHost === false ? (
        <button
          type="button"
          disabled={loggingOut}
          onClick={useDifferentWallet}
          className="mt-3 w-full text-center text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-60"
        >
          {loggingOut ? tr("Switching…", "Cambiando…", "Trocando…") : tr("Use a different wallet", "Usar otra wallet", "Usar outra carteira")}
        </button>
      ) : null}
    </div>
  );
}
