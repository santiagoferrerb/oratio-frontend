import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@heroui/react";
import {
  HiBars3,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineBuildingOffice2,
  HiOutlineChevronRight,
  HiOutlineInformationCircle,
  HiOutlineHome,
  HiOutlineArrowRightOnRectangle,
  HiOutlineSquares2X2,
  HiOutlinePlay,
  HiOutlineSparkles,
  HiXMark,
} from "react-icons/hi2";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", icon: HiOutlineHome },
  { to: "/companies", label: "Empresas", icon: HiOutlineBuildingOffice2 },
  { to: "/videos", label: "Videos", icon: HiOutlinePlay },
  { to: "/script-generations", label: "Guiones", icon: HiOutlineSparkles },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const items = user?.role?.name === "admin"
    ? [
        ...navigationItems,
        { to: "/admin/prompt-templates", label: "Prompts", icon: HiOutlineAdjustmentsHorizontal },
      ]
    : navigationItems;
  const activeItem = useMemo(
    () =>
      items.find((item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
      ) || items[0],
    [items, location.pathname],
  );
  const contextualTip = useMemo(() => {
    if (location.pathname.startsWith("/dashboard")) {
      return "Usa este panel para detectar rapido que contenido requiere la siguiente accion.";
    }

    if (location.pathname.startsWith("/videos")) {
      return "Empieza asociando videos a una empresa y luego sigue el flujo de audio, transcripcion y analisis.";
    }

    if (location.pathname.startsWith("/script-generations")) {
      return "Agrupa los guiones por empresa o campana y compara variantes antes de elegir una salida final.";
    }

    return null;
  }, [location.pathname]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  function renderNavItems({ collapsed = false } = {}) {
    return items.map((item) => {
      const Icon = item.icon;

      return (
        <NavLink
          key={item.to}
          to={item.to}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            [
              "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
              collapsed ? "justify-center px-2" : "",
              isActive
                ? "bg-sky-100 text-sky-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")
          }
        >
          <Icon className="text-lg" />
          {!collapsed ? <span>{item.label}</span> : null}
        </NavLink>
      );
    });
  }

  const sidebarBaseClassName = [
    "flex h-full flex-col border-r border-slate-200/80 bg-white/92 backdrop-blur-xl transition-all",
    sidebarCollapsed ? "w-24" : "w-[288px]",
  ].join(" ");
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "U";
  const secondaryRoleLabel = user?.role?.name === "admin" ? "Administrador" : "Usuario";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900">
      <aside className={`${sidebarBaseClassName} hidden lg:flex`}>
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-5">
          <div className={sidebarCollapsed ? "hidden" : "block"}>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Oratio</p>
            <h1 className="mt-2 text-2xl font-semibold">Produccion</h1>
          </div>
          {sidebarCollapsed ? (
            <div className="flex w-full justify-center">
              <HiOutlineSquares2X2 className="text-2xl text-sky-600" />
            </div>
          ) : null}
          <Button
            isIconOnly
            variant="light"
            className="text-slate-600"
            onPress={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? <HiChevronRight className="text-lg" /> : <HiChevronLeft className="text-lg" />}
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
          <nav className="space-y-2">{renderNavItems({ collapsed: sidebarCollapsed })}</nav>

          {!sidebarCollapsed ? (
            <div className="flex-1" />
          ) : null}

          <div className="mt-auto">
            <Dropdown placement={sidebarCollapsed ? "right-end" : "top-start"}>
              <DropdownTrigger>
                <button
                  type="button"
                  className={[
                    "flex w-full items-center rounded-[1.75rem] border border-slate-200 bg-white/90 text-left transition hover:border-slate-300 hover:bg-slate-50",
                    sidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
                  ].join(" ")}
                >
                  <Avatar
                    name={user?.name || "Usuario"}
                    fallback={initials}
                    className="h-11 w-11 shrink-0 bg-lime-500/90 text-slate-900"
                  />
                  {!sidebarCollapsed ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user?.name || "Usuario"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {secondaryRoleLabel} · {user?.email || "Sin email"}
                      </p>
                    </div>
                  ) : null}
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Acciones de sesion">
                <DropdownItem key="profile" className="h-14 gap-2" textValue="Perfil activo">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      {user?.name || "Usuario"}
                    </span>
                    <span className="text-xs text-slate-500">{user?.email || "Sin email"}</span>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  className="text-danger"
                  color="danger"
                  startContent={<HiOutlineArrowRightOnRectangle className="text-lg" />}
                  onPress={logout}
                >
                  Cerrar sesion
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </aside>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <aside
            className="h-full w-[88vw] max-w-[320px] border-r border-slate-200/80 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Oratio</p>
                <h1 className="mt-2 text-2xl font-semibold">Produccion</h1>
              </div>
              <Button
                isIconOnly
                variant="light"
                className="text-slate-600"
                onPress={() => setMobileSidebarOpen(false)}
              >
                <HiXMark className="text-xl" />
              </Button>
            </div>
            <div className="flex h-[calc(100%-89px)] flex-col gap-5 overflow-y-auto px-4 py-5">
              <nav className="space-y-2">{renderNavItems()}</nav>

              <div className="mt-auto">
                <Dropdown placement="top-start">
                  <DropdownTrigger>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white/90 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Avatar
                        name={user?.name || "Usuario"}
                        fallback={initials}
                        className="h-11 w-11 shrink-0 bg-lime-500/90 text-slate-900"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {user?.name || "Usuario"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {secondaryRoleLabel} · {user?.email || "Sin email"}
                        </p>
                      </div>
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Acciones de sesion mobile">
                    <DropdownItem key="profile" className="h-14 gap-2" textValue="Perfil activo">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {user?.name || "Usuario"}
                        </span>
                        <span className="text-xs text-slate-500">{user?.email || "Sin email"}</span>
                      </div>
                    </DropdownItem>
                    <DropdownItem
                      key="logout"
                      className="text-danger"
                      color="danger"
                      startContent={<HiOutlineArrowRightOnRectangle className="text-lg" />}
                      onPress={logout}
                    >
                      Cerrar sesion
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              isIconOnly
              variant="light"
              className="lg:hidden"
              onPress={() => setMobileSidebarOpen(true)}
            >
              <HiBars3 className="text-xl" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Workspace</p>
              <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                {activeItem?.label || "Panel"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contextualTip ? (
              <Tooltip content={contextualTip} placement="bottom" className="max-w-xs">
                <Button isIconOnly variant="light" className="text-slate-500">
                  <HiOutlineInformationCircle className="text-xl" />
                </Button>
              </Tooltip>
            ) : null}
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 md:flex">
              <span>Navegacion</span>
              <HiOutlineChevronRight className="text-slate-300" />
              <span>{activeItem?.label || "Panel"}</span>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="min-h-full px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
