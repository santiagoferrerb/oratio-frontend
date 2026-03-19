import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { HiOutlineBuildingOffice2, HiOutlinePlus, HiOutlineSparkles } from "react-icons/hi2";
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{campaign.name}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{campaign.objective}</p>
        </div>
        <Chip size="sm" variant="flat" color={campaign.status === "active" ? "success" : "default"}>
          {campaignStatusLabels[campaign.status] || campaign.status}
        </Chip>
      </div>

      {campaign.core_message ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          <span className="font-medium text-slate-800">Mensaje:</span> {campaign.core_message}
        </p>
      ) : null}
    </div>
  );
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
      setError(requestError.response?.data?.message || "No se pudieron cargar las empresas.");
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
      campaigns: companies.reduce((total, company) => total + (company.campaigns?.length || 0), 0),
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
    const activeBrief = company.briefs?.find((brief) => brief.is_active) || company.briefs?.[0];

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
          (editingCompany ? "No se pudo actualizar la empresa." : "No se pudo crear la empresa."),
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
      setCampaignError(requestError.response?.data?.message || "No se pudo crear la campana.");
    } finally {
      setSubmittingCampaign(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 pb-10">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-sky-600">Empresas</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Contexto de marca y campanas
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Prioriza las empresas ya creadas, revisa su brief activo y agrega campanas sin perder
            el foco del listado.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">{companiesSummary.companies}</span>{" "}
            empresas
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">{companiesSummary.campaigns}</span>{" "}
            campanas
          </div>
          <Button color="primary" startContent={<HiOutlinePlus />} onPress={openCompanyModal}>
            Nueva empresa
          </Button>
        </div>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? <p className="text-sm text-slate-500">Cargando empresas...</p> : null}

      {!loading && companies.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-white/70">
          <CardBody className="flex flex-col items-start gap-4 p-8 text-sm leading-7 text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <HiOutlineBuildingOffice2 className="text-2xl" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Aun no hay empresas</p>
              <p className="mt-2 max-w-xl">
                Crea la primera empresa para empezar a organizar brief, videos y campanas desde un
                contexto de marca consistente.
              </p>
            </div>
            <Button color="primary" startContent={<HiOutlinePlus />} onPress={openCompanyModal}>
              Crear primera empresa
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {companies.length ? (
        <Accordion selectionMode="multiple" variant="splitted" className="px-0">
          {companies.map((company) => {
            const activeBrief =
              company.briefs?.find((brief) => brief.is_active) || company.briefs?.[0];
            const campaigns = company.campaigns || [];
            const visibleCampaigns = campaigns.slice(0, 2);
            const briefSummary = activeBrief?.objective_summary || "Sin objetivo";

            return (
              <AccordionItem
                key={String(company.id)}
                aria-label={company.name}
                classNames={{
                  base: "rounded-[1.75rem] border border-slate-200/80 bg-white/90 px-0 shadow-sm shadow-slate-200/40",
                  trigger: "cursor-pointer px-6 py-5 hover:bg-slate-50/80",
                  title: "text-left",
                  content: "px-6 pb-6 pt-0",
                }}
                title={
                  <div className="min-w-0 max-w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-xl font-semibold tracking-tight text-slate-950">
                        {company.name}
                      </p>
                      <Chip size="sm" variant="flat" color="primary">
                        #{company.id}
                      </Chip>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-500">
                      {company.industry || "Industria no definida"}
                    </p>
                  </div>
                }
                subtitle={
                  <div className="mt-3 flex min-w-0 max-w-full items-center gap-2 overflow-hidden text-sm text-slate-500">
                    <span className="shrink-0">{campaigns.length} campanas</span>
                    <span className="text-slate-300">·</span>
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {briefSummary}
                    </span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="light" onPress={() => openEditCompanyModal(company)}>
                      Editar empresa
                    </Button>
                    <Button
                      color="secondary"
                      variant="flat"
                      startContent={<HiOutlineSparkles />}
                      onPress={() => openCampaignModal(company)}
                    >
                      Crear campana
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tono</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {activeBrief?.tone || "Sin brief activo"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Audiencia</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {activeBrief?.target_audience || "Sin audiencia definida"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">CTA</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {activeBrief?.cta_style || "Sin CTA style"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Objetivo</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {activeBrief?.objective || "Sin objetivo declarado"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/60 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                          Campanas
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {campaigns.length
                            ? `${campaigns.length} registradas para esta empresa.`
                            : "Todavia no hay campanas para esta empresa."}
                        </p>
                      </div>
                      {campaigns.length ? (
                        <Chip size="sm" variant="flat">
                          {campaigns.length} total
                        </Chip>
                      ) : null}
                    </div>

                    {visibleCampaigns.length ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {visibleCampaigns.map((campaign) => (
                          <CampaignPreview key={campaign.id} campaign={campaign} />
                        ))}
                      </div>
                    ) : null}

                    {campaigns.length > visibleCampaigns.length ? (
                      <p className="mt-4 text-sm text-slate-500">
                        Y {campaigns.length - visibleCampaigns.length} campanas mas listas para revisar.
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
            <form onSubmit={handleCompanySubmit} className="flex h-full flex-col overflow-hidden">
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-slate-950">
                  {editingCompany ? "Editar empresa" : "Nueva empresa"}
                </span>
                <span className="text-sm font-normal text-slate-500">
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
                <Input label="Tono" name="tone" value={companyForm.tone} onChange={handleCompanyChange} />
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
                {companyError ? <p className="text-sm text-danger">{companyError}</p> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" type="submit" isLoading={submittingCompany}>
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
            <form onSubmit={handleCampaignSubmit} className="flex h-full flex-col overflow-hidden">
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-slate-950">Nueva campana</span>
                <span className="text-sm font-normal text-slate-500">
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
                {campaignError ? <p className="text-sm text-danger">{campaignError}</p> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="secondary" type="submit" isLoading={submittingCampaign}>
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
