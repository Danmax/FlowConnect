"use client";

export function LogoutButton() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <button className="button" onClick={logout} type="button">
      Logout
    </button>
  );
}
