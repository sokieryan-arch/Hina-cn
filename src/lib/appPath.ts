const HINA_MOUNT_PATH = "/hina";

export function getAppMountPath(pathname?: string) {
  const currentPath = pathname
    ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  return currentPath === HINA_MOUNT_PATH || currentPath.startsWith(`${HINA_MOUNT_PATH}/`)
    ? HINA_MOUNT_PATH
    : "";
}

export function withAppBase(path: string, pathname?: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${getAppMountPath(pathname)}${path}`;
}
