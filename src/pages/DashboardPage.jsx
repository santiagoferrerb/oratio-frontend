import { useEffect, useState } from "react";
import { Button, Chip, Progress } from "@heroui/react";
import {
  HiArrowUpRight,
  HiCheckBadge,
  HiOutlineBolt,
  HiOutlinePlay,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardOverview } from "../services/dashboardService";

const pipelineLabels = {
  pending: "Pendiente",
  processing: "Procesando",
  ready: "Listo",
  failed: "Con bloqueo",
  draft: "Borrador",
};

function StageChip({ stage }) {
  const colorMap = {
    pending: "default",
    processing: "warning",
    ready: "success",
    failed: "danger",
    draft: "secondary",
  };

  return (
    <Chip color={colorMap[stage] || "default"} variant="flat">
      {pipelineLabels[stage] || stage}
    </Chip>
  );
}

function ProjectItem({ project }) {
  return (
    <article className="border-t border-slate-200/80 py-6 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StageChip stage={project.status} />
            <span className="text-sm text-slate-500">
              {project.company} · {project.source}
            </span>
          </div>

          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {project.title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{project.summary}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Siguiente accion</p>
              <p className="mt-2 text-base font-medium leading-7 text-slate-900">
                {project.nextAction}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Progreso</span>
                <span>{project.progress}%</span>
              </div>
              <Progress
                aria-label={`Progreso del proyecto ${project.title}`}
                value={project.progress}
                className="mt-3"
                color="primary"
              />
            </div>
          </div>
        </div>

        <Button as={Link} to="/script-generations" color="primary" startContent={<HiOutlinePlay />}>
          Continuar
        </Button>
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const { overview: nextOverview } = await getDashboardOverview();
        setOverview(nextOverview);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "No se pudo cargar el dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, []);

  const recentProjects =
    overview?.recent_script_generations?.map((scriptGeneration) => ({
      id: scriptGeneration.id,
      title: `Generacion #${scriptGeneration.id}`,
      company: `Empresa #${scriptGeneration.company_id}`,
      campaign: scriptGeneration.campaign?.name || null,
      source: scriptGeneration.video?.platform || "Sin plataforma",
      status: scriptGeneration.status,
      progress:
        scriptGeneration.status === "ready"
          ? 100
          : scriptGeneration.status === "draft"
            ? 35
            : 65,
      nextAction:
        scriptGeneration.status === "ready"
          ? "Revisar variante final y preparar publicacion"
          : "Completar transcripcion, adaptacion y cierre comercial",
      summary:
        scriptGeneration.video?.platform
          ? `${scriptGeneration.campaign?.name ? `Campana ${scriptGeneration.campaign.name}. ` : ""}Asociado a ${scriptGeneration.video.platform}. Version ${scriptGeneration.version}.`
          : `Version ${scriptGeneration.version} lista para continuar.`,
    })) || [];

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 pb-10">
      <section className="border-b border-slate-200/80 pb-6 pt-1">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-600">Home interno</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Panel de trabajo editorial
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
              Revisa el estado del pipeline y retoma rapido los guiones que todavia necesitan una
              siguiente accion clara.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              as={Link}
              to="/script-generations"
              color="primary"
              startContent={<HiOutlineBolt />}
            >
              Nuevo guion
            </Button>
            <Button
              as={Link}
              to="/companies"
              variant="light"
              className="text-slate-700"
              startContent={<HiOutlineSparkles />}
            >
              Ver perfil de empresa
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-sm text-slate-400">Guiones activos</p>
            <strong className="mt-2 block text-3xl font-semibold">
              {overview?.metrics?.script_generations || 0}
            </strong>
            <p className="mt-1 text-sm text-slate-300">
              {overview?.recent_script_generations?.length || 0} recientes listos para revisar
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm text-slate-500">Videos por procesar</p>
            <strong className="mt-2 block text-3xl font-semibold text-slate-950">
              {overview?.videos_by_status?.pending || 0}
            </strong>
            <p className="mt-1 text-sm text-slate-500">
              {overview?.videos_by_status?.processing || 0} adicionales siguen en procesamiento.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm text-slate-500">Empresas activas</p>
            <strong className="mt-2 block text-3xl font-semibold text-slate-950">
              {overview?.metrics?.companies || 0}
            </strong>
            <p className="mt-1 text-sm text-slate-500">
              {overview?.metrics?.videos || 0} videos asociados al flujo actual.
            </p>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Guiones</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Continuar trabajo en progreso
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <HiCheckBadge className="text-base text-sky-600" />
              <span>{recentProjects.length} proyectos con siguiente accion definida</span>
            </div>
          </div>

          <div className="mt-2">
            {loading ? <p className="py-6 text-sm text-slate-500">Cargando dashboard...</p> : null}
            {error ? <p className="py-6 text-sm text-danger">{error}</p> : null}
            {!loading && !error && recentProjects.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">
                Todavia no hay generaciones creadas. Empieza creando empresa, video y primer guion.
              </p>
            ) : null}
            {recentProjects.map((project) => (
              <ProjectItem key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-sky-50/90 p-5">
        <div className="flex items-center gap-2 text-sky-700">
          <HiArrowUpRight className="text-lg" />
          <p className="text-xs uppercase tracking-[0.24em]">Foco de hoy</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Primero consolida empresas y videos. Con eso ya puedes probar el circuito completo
          hasta generacion de guiones antes de automatizar transcripcion.
        </p>
      </section>
    </div>
  );
}
