import { Button, Card, CardBody } from "@heroui/react";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineBuildingOffice2,
  HiOutlineHome,
  HiOutlinePlay,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", icon: HiOutlineHome },
  { to: "/companies", label: "Empresas", icon: HiOutlineBuildingOffice2 },
  { to: "/videos", label: "Videos", icon: HiOutlinePlay },
  { to: "/script-generations", label: "Guiones", icon: HiOutlineSparkles },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const items = user?.role?.name === "admin"
    ? [
        ...navigationItems,
        { to: "/admin/prompt-templates", label: "Prompts", icon: HiOutlineAdjustmentsHorizontal },
      ]
    : navigationItems;

  return (
    <div className="h-screen overflow-hidden bg-transparent px-4 py-4 text-slate-900 md:px-6 md:py-6">
      <div className="mx-auto grid h-full max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-full border border-white/40 bg-white/78 shadow-xl shadow-sky-100 backdrop-blur">
          <CardBody className="flex h-full flex-col gap-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Oratio</p>
              <h1 className="mt-2 text-3xl font-semibold">Produccion</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Organiza referencias, contexto de marca y guiones que todavia necesitan trabajo.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 text-slate-50">
              <p className="text-sm text-slate-300">Sesion activa</p>
              <p className="mt-1 text-lg font-medium">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
            <nav className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                        isActive
                          ? "bg-sky-100 text-sky-900"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")
                    }
                  >
                    <Icon className="text-lg" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Modo de trabajo</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Primero estructura marca y fuentes. Luego convierte eso en guiones trazables.
              </p>
            </div>
            <div className="mt-auto">
              <Button color="danger" variant="flat" fullWidth onPress={logout}>
                Cerrar sesion
              </Button>
            </div>
          </CardBody>
        </Card>
        <main className="min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pr-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
