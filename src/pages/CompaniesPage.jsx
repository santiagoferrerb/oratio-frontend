import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { LuDot } from "react-icons/lu";

import {
  HiOutlineBuildingOffice2,
  HiOutlineEllipsisHorizontal,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineSparkles,
} from "react-icons/hi2";
import {
  createCampaign,
  createCompany,
  getCompanies,
  updateCompany,
} from "../services/companyService";

const initialCompanyForm = {
  name: "",
  industry: "",
  tone: "",
  target_audience: "",
  brand_values: "",
  communication_style: "",
  cta_style: "",
  preferred_words: "",
  forbidden_words: "",
  objective: "",
};

const initialCampaignForm = {
  name: "",
  objective: "",
  core_message: "",
  target_audience: "",
  communication_style: "",
  cta: "",
  incentives: "",
  status: "draft",
};

const campaignStatusLabels = {
  draft: "Draft",
  active: "Activa",
  archived: "Archivada",
};

function CampaignPreview({ campaign }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-950">
            {campaign.name}
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {campaign.objective}
          </p>
        </div>
        <Chip
          size="sm"
          variant="flat"
          color={campaign.status === "active" ? "success" : "default"}
        >
          {campaignStatusLabels[campaign.status] || campaign.status}
        </Chip>
      </div>

      {campaign.core_message ? (
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          <span className="font-medium text-neutral-800">Mensaje:</span>{" "}
          {campaign.core_message}
        </p>
      ) : null}
    </div>
  );
}

function formatDisplayText(value, fallback) {
  if (!value) {
    return fallback;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [companyForm, setCompanyForm] = useState(initialCompanyForm);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingCompany, setSubmittingCompany] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [campaignError, setCampaignError] = useState("");

  async function loadCompanies() {
    setLoading(true);
    setError("");

    try {
      const { companies: nextCompanies } = await getCompanies();
      setCompanies(nextCompanies);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "No se pudieron cargar las empresas.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const companiesSummary = useMemo(
    () => ({
      companies: companies.length,
      campaigns: companies.reduce(
        (total, company) => total + (company.campaigns?.length || 0),
        0,
      ),
    }),
    [companies],
  );

  function handleCompanyChange(event) {
    const { name, value } = event.target;
    setCompanyForm((current) => ({ ...current, [name]: value }));
  }

  function handleCampaignChange(event) {
    const { name, value } = event.target;
    setCampaignForm((current) => ({ ...current, [name]: value }));
  }

  function openCompanyModal() {
    setCompanyError("");
    setCompanyForm(initialCompanyForm);
    setEditingCompany(null);
    setIsCompanyModalOpen(true);
  }

  function openEditCompanyModal(company) {
    const activeBrief =
      company.briefs?.find((brief) => brief.is_active) || company.briefs?.[0];

    setCompanyError("");
    setEditingCompany(company);
    setCompanyForm({
      name: company.name || "",
      industry: company.industry || "",
      tone: activeBrief?.tone || "",
      target_audience: activeBrief?.target_audience || "",
      brand_values: activeBrief?.brand_values || "",
      communication_style: activeBrief?.communication_style || "",
      cta_style: activeBrief?.cta_style || "",
      preferred_words: activeBrief?.preferred_words || "",
      forbidden_words: activeBrief?.forbidden_words || "",
      objective: activeBrief?.objective || "",
    });
    setIsCompanyModalOpen(true);
  }

  function openCampaignModal(company) {
    setSelectedCompany(company);
    setCampaignError("");
    setCampaignForm(initialCampaignForm);
    setIsCampaignModalOpen(true);
  }

  async function handleCompanySubmit(event) {
    event.preventDefault();
    setSubmittingCompany(true);
    setCompanyError("");

    try {
      const payload = {
        name: companyForm.name,
        industry: companyForm.industry || null,
        brief: {
          tone: companyForm.tone || null,
          target_audience: companyForm.target_audience || null,
          brand_values: companyForm.brand_values || null,
          communication_style: companyForm.communication_style || null,
          cta_style: companyForm.cta_style || null,
          preferred_words: companyForm.preferred_words || null,
          forbidden_words: companyForm.forbidden_words || null,
          objective: companyForm.objective || null,
        },
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
      } else {
        await createCompany(payload);
      }

      setIsCompanyModalOpen(false);
      setCompanyForm(initialCompanyForm);
      setEditingCompany(null);
      await loadCompanies();
    } catch (requestError) {
      setCompanyError(
        requestError.response?.data?.message ||
          (editingCompany
            ? "No se pudo actualizar la empresa."
            : "No se pudo crear la empresa."),
      );
    } finally {
      setSubmittingCompany(false);
    }
  }

  async function handleCampaignSubmit(event) {
    event.preventDefault();
    if (!selectedCompany) {
      return;
    }

    setSubmittingCampaign(true);
    setCampaignError("");

    try {
      await createCampaign({
        company_id: selectedCompany.id,
        name: campaignForm.name,
        objective: campaignForm.objective,
        core_message: campaignForm.core_message || null,
        target_audience: campaignForm.target_audience || null,
        communication_style: campaignForm.communication_style || null,
        cta: campaignForm.cta || null,
        incentives: campaignForm.incentives || null,
        status: campaignForm.status,
      });
      setIsCampaignModalOpen(false);
      setCampaignForm(initialCampaignForm);
      setSelectedCompany(null);
      await loadCompanies();
    } catch (requestError) {
      setCampaignError(
        requestError.response?.data?.message || "No se pudo crear la campana.",
      );
    } finally {
      setSubmittingCampaign(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 pb-10">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200/80 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
            Gestion de empresas
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Revisa el contexto de marca y crea Campaña sin salir del listado.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            <span className="font-semibold text-neutral-950">
              {companiesSummary.companies}
            </span>{" "}
            Empresas
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            <span className="font-semibold text-neutral-950">
              {companiesSummary.campaigns}
            </span>{" "}
            Campañas
          </div>
          <Button
            color="primary"
            startContent={<HiOutlinePlus />}
            onPress={openCompanyModal}
          >
            Nueva empresa
          </Button>
        </div>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Cargando empresas...</p>
      ) : null}

      {!loading && companies.length === 0 ? (
        <Card className="border border-dashed border-neutral-300 bg-white/70">
          <CardBody className="flex flex-col items-start gap-4 p-8 text-sm leading-7 text-neutral-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <HiOutlineBuildingOffice2 className="text-2xl" />
            </div>
            <div>
              <p className="text-base font-semibold text-neutral-900">
                Aun no hay empresas
              </p>
              <p className="mt-2 max-w-xl">
                Crea la primera empresa para empezar a organizar brief, videos y
                Campaña desde un contexto de marca consistente.
              </p>
            </div>
            <Button
              color="primary"
              startContent={<HiOutlinePlus />}
              onPress={openCompanyModal}
            >
              Crear primera empresa
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {companies.length ? (
        <Accordion selectionMode="multiple" variant="splitted" className="px-0">
          {companies.map((company) => {
            const activeBrief =
              company.briefs?.find((brief) => brief.is_active) ||
              company.briefs?.[0];
            const campaigns = company.campaigns || [];
            const visibleCampaigns = campaigns.slice(0, 2);
            const hasBrief = Boolean(activeBrief);
            const briefSummary =
              activeBrief?.objective_summary ||
              activeBrief?.objective ||
              "Sin brief activo";

            return (
              <AccordionItem
                key={String(company.id)}
                aria-label={company.name}
                classNames={{
                  base: "rounded-[1.75rem] border border-neutral-200/80 bg-white/90 px-0 shadow-sm shadow-neutral-200/40",
                  trigger: "cursor-pointer px-6 py-5 hover:bg-neutral-50/80",
                  title: "text-left",
                  content: "px-6 pb-6 pt-0",
                }}
                title={
                  <div className="min-w-0 max-w-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="min-w-0 truncate text-xl font-semibold tracking-tight text-neutral-950">
                            {company.name}
                          </p>
                          <Chip size="sm" variant="flat" color="primary">
                            {campaigns.length} campanas
                          </Chip>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
                          <span>
                            {company.industry || "Industria no definida"}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span>{hasBrief ? "Brief activo" : "Sin brief"}</span>
                        </div>
                      </div>
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <button
                            type="button"
                            aria-label={`Acciones de ${company.name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700"
                          >
                            <HiOutlineEllipsisHorizontal className="text-lg" />
                          </button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label={`Acciones para ${company.name}`}
                        >
                          <DropdownItem
                            key="edit-company"
                            startContent={<HiOutlinePencilSquare />}
                            onPress={() => openEditCompanyModal(company)}
                          >
                            Editar empresa
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                }
                subtitle={
                  <div className="mt-3 flex min-w-0 max-w-full items-center gap-2 overflow-hidden text-sm text-neutral-500">
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {briefSummary}
                    </span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="rounded-[1.5rem] border border-neutral-200/80 bg-white px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
                          Brief
                        </p>
                        <LuDot />
                        <p className=" text-sm text-neutral-500">
                          Resumen rapido del contexto de marca para esta
                          empresa.
                        </p>
                      </div>
                      {!hasBrief && (
                        <Chip size="sm" variant="flat" color="warning">
                          Pendiente
                        </Chip>
                      )}
                    </div>

                    <div className="mt-8 space-y-3">
                      <div className="grid gap-1 md:grid-cols-[120px_minmax(0,1fr)] md:items-start md:gap-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-800">
                          Objetivo
                        </p>
                        <p className="text-sm leading-6 text-neutral-700">
                          {formatDisplayText(
                            activeBrief?.objective,
                            "Sin objetivo declarado",
                          )}
                        </p>
                      </div>
                      <div className="grid gap-1 border-t border-neutral-100 pt-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-start md:gap-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-800">
                          Audiencia
                        </p>
                        <p className="text-sm leading-6 text-neutral-700">
                          {formatDisplayText(
                            activeBrief?.target_audience,
                            "Sin audiencia definida",
                          )}
                        </p>
                      </div>
                      <div className="grid gap-1 border-t border-neutral-100 pt-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-start md:gap-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-800">
                          Tono
                        </p>
                        <p className="text-sm leading-6 text-neutral-700">
                          {formatDisplayText(
                            activeBrief?.tone,
                            "Sin tono definido",
                          )}
                        </p>
                      </div>
                      <div className="grid gap-1 border-t border-neutral-100 pt-3 md:grid-cols-[120px_minmax(0,1fr)] md:items-start md:gap-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-800">
                          CTA
                        </p>
                        <p className="text-sm leading-6 text-neutral-700">
                          {formatDisplayText(
                            activeBrief?.cta_style,
                            "Sin CTA definido",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-neutral-200/80 bg-neutral-50/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">
                          Campaña
                        </p>
                        <p className="mt-2 text-sm text-neutral-500">
                          {campaigns.length
                            ? `${campaigns.length} registradas para esta empresa.`
                            : "Todavia no hay Campaña para esta empresa."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {campaigns.length ? (
                          <Chip size="sm" variant="flat">
                            {campaigns.length} total
                          </Chip>
                        ) : null}
                        <Button
                          color="secondary"
                          variant="flat"
                          startContent={<HiOutlineSparkles />}
                          onPress={() => openCampaignModal(company)}
                        >
                          Crear campana
                        </Button>
                      </div>
                    </div>

                    {visibleCampaigns.length ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {visibleCampaigns.map((campaign) => (
                          <CampaignPreview
                            key={campaign.id}
                            campaign={campaign}
                          />
                        ))}
                      </div>
                    ) : null}

                    {campaigns.length > visibleCampaigns.length ? (
                      <p className="mt-4 text-sm text-neutral-500">
                        Y {campaigns.length - visibleCampaigns.length} Campaña
                        mas listas para revisar.
                      </p>
                    ) : null}
                  </div>
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : null}

      <Modal
        isOpen={isCompanyModalOpen}
        onOpenChange={(open) => {
          setIsCompanyModalOpen(open);
          if (!open) {
            setEditingCompany(null);
          }
        }}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent className="max-h-[85vh]">
          {(onClose) => (
            <form
              onSubmit={handleCompanySubmit}
              className="flex h-full flex-col overflow-hidden"
            >
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-neutral-950">
                  {editingCompany ? "Editar empresa" : "Nueva empresa"}
                </span>
                <span className="text-sm font-normal text-neutral-500">
                  {editingCompany
                    ? "Actualiza los datos base y el brief activo de la empresa."
                    : "Crea la empresa y define su primer brief activo."}
                </span>
              </ModalHeader>
              <ModalBody className="grid min-h-0 flex-1 gap-4 overflow-y-auto pb-2">
                <Input
                  label="Nombre"
                  name="name"
                  value={companyForm.name}
                  onChange={handleCompanyChange}
                  isRequired
                />
                <Input
                  label="Industria"
                  name="industry"
                  value={companyForm.industry}
                  onChange={handleCompanyChange}
                />
                <Input
                  label="Tono"
                  name="tone"
                  value={companyForm.tone}
                  onChange={handleCompanyChange}
                />
                <Input
                  label="Audiencia"
                  name="target_audience"
                  value={companyForm.target_audience}
                  onChange={handleCompanyChange}
                />
                <Input
                  label="CTA style"
                  name="cta_style"
                  value={companyForm.cta_style}
                  onChange={handleCompanyChange}
                />
                <Textarea
                  label="Valores de marca"
                  name="brand_values"
                  value={companyForm.brand_values}
                  onChange={handleCompanyChange}
                  minRows={2}
                />
                <Textarea
                  label="Estilo de comunicacion"
                  name="communication_style"
                  value={companyForm.communication_style}
                  onChange={handleCompanyChange}
                  minRows={2}
                />
                <Textarea
                  label="Palabras preferidas"
                  name="preferred_words"
                  value={companyForm.preferred_words}
                  onChange={handleCompanyChange}
                  minRows={2}
                />
                <Textarea
                  label="Palabras prohibidas"
                  name="forbidden_words"
                  value={companyForm.forbidden_words}
                  onChange={handleCompanyChange}
                  minRows={2}
                />
                <Textarea
                  label="Objetivo"
                  name="objective"
                  value={companyForm.objective}
                  onChange={handleCompanyChange}
                  minRows={3}
                />
                {companyError ? (
                  <p className="text-sm text-danger">{companyError}</p>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isLoading={submittingCompany}
                >
                  {editingCompany ? "Guardar cambios" : "Crear empresa"}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isCampaignModalOpen}
        onOpenChange={(open) => {
          setIsCampaignModalOpen(open);
          if (!open) {
            setSelectedCompany(null);
          }
        }}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent className="max-h-[85vh]">
          {(onClose) => (
            <form
              onSubmit={handleCampaignSubmit}
              className="flex h-full flex-col overflow-hidden"
            >
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-neutral-950">
                  Nueva campana
                </span>
                <span className="text-sm font-normal text-neutral-500">
                  {selectedCompany
                    ? `Se creara dentro de ${selectedCompany.name}.`
                    : "Define un objetivo comercial claro para esta marca."}
                </span>
              </ModalHeader>
              <ModalBody className="grid min-h-0 flex-1 gap-4 overflow-y-auto pb-2">
                <Input
                  label="Nombre de campana"
                  name="name"
                  value={campaignForm.name}
                  onChange={handleCampaignChange}
                  isRequired
                />
                <Textarea
                  label="Objetivo"
                  name="objective"
                  value={campaignForm.objective}
                  onChange={handleCampaignChange}
                  minRows={3}
                  isRequired
                />
                <Textarea
                  label="Mensaje central"
                  name="core_message"
                  value={campaignForm.core_message}
                  onChange={handleCampaignChange}
                  minRows={2}
                />
                <Input
                  label="Audiencia"
                  name="target_audience"
                  value={campaignForm.target_audience}
                  onChange={handleCampaignChange}
                />
                <Textarea
                  label="Estilo de comunicacion"
                  name="communication_style"
                  value={campaignForm.communication_style}
                  onChange={handleCampaignChange}
                  minRows={2}
                />
                <Textarea
                  label="CTA"
                  name="cta"
                  value={campaignForm.cta}
                  onChange={handleCampaignChange}
                  minRows={2}
                />
                <Textarea
                  label="Incentivos"
                  name="incentives"
                  value={campaignForm.incentives}
                  onChange={handleCampaignChange}
                  minRows={3}
                />
                {campaignError ? (
                  <p className="text-sm text-danger">{campaignError}</p>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="secondary"
                  type="submit"
                  isLoading={submittingCampaign}
                >
                  Crear campana
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
