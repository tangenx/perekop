"use strict";
"require view";
"require form";
"require baseclass";
"require network";
"require view.perekop.main as main";

// Settings content
"require view.perekop.settings as settings";

// Sections content
"require view.perekop.section as section";

// Dashboard content
"require view.perekop.dashboard as dashboard";

// Diagnostic content
"require view.perekop.diagnostic as diagnostic";

const EntryPoint = {
  async render() {
    main.injectGlobalStyles();

    // Options requiring features are created conditionally
    const xrayFeatures = await main.CustomPerekopMethods.getXrayFeatures();

    const perekopMap = new form.Map(
      "perekop",
      _("Perekop Settings"),
      _("Configuration for Perekop service"),
    );
    // Enable tab views
    perekopMap.tabbed = true;

    // Sections tab
    const sectionsSection = perekopMap.section(
      form.TypedSection,
      "section",
      _("Sections"),
    );
    sectionsSection.anonymous = false;
    sectionsSection.addremove = true;
    sectionsSection.template = "cbi/simpleform";

    // Render section content
  section.createSectionContent(sectionsSection, xrayFeatures);

    // Settings tab
    const settingsSection = perekopMap.section(
      form.TypedSection,
      "settings",
      _("Settings"),
    );
    settingsSection.anonymous = true;
    settingsSection.addremove = false;
    // Make it named [ config settings 'settings' ]
    settingsSection.cfgsections = function () {
      return ["settings"];
    };

    // Render settings content
  settings.createSettingsContent(settingsSection, xrayFeatures);

    // Diagnostic tab
    const diagnosticSection = perekopMap.section(
      form.TypedSection,
      "diagnostic",
      _("Diagnostics"),
    );
    diagnosticSection.anonymous = true;
    diagnosticSection.addremove = false;
    diagnosticSection.cfgsections = function () {
      return ["diagnostic"];
    };

    // Render diagnostic content
    diagnostic.createDiagnosticContent(diagnosticSection);

    // Dashboard tab
    const dashboardSection = perekopMap.section(
      form.TypedSection,
      "dashboard",
      _("Dashboard"),
    );
    dashboardSection.anonymous = true;
    dashboardSection.addremove = false;
    dashboardSection.cfgsections = function () {
      return ["dashboard"];
    };

    // Render dashboard content
    dashboard.createDashboardContent(dashboardSection);

    // Inject core service
    main.coreService();

    return perekopMap.render();
  },
};

return view.extend(EntryPoint);
