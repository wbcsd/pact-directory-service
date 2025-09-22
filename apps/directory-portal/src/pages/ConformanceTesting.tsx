import React, { useState } from "react";
import { Box, Button, TextField } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import * as Form from "@radix-ui/react-form";
import SideNav from "../components/SideNav";
import { useNavigate } from "react-router-dom";
import { useConformanceTesting } from "../components/ConformanceTesting";
import "./ConformanceTesting.css";

const ConformanceTesting: React.FC = () => {
  const {
    setApiUrl,
    setAuthBaseUrl,
    setClientId,
    setClientSecret,
    setVersion,
    setAuthOptions,
    apiUrl,
    authBaseUrl,
    clientId,
    clientSecret,
    version,
    authOptions,
  } = useConformanceTesting();

  const { t } = useTranslation();

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    solutionApiUrl: apiUrl,
    authBaseUrl: authBaseUrl,
    clientId: clientId,
    clientSecret: clientSecret,
    techSpecsVersion: version,
    authOptionsScope: authOptions.scope,
    authOptionsAudience: authOptions.audience,
    authOptionsResource: authOptions.resource,
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    setApiUrl(formData.solutionApiUrl);
    setAuthBaseUrl(formData.authBaseUrl);
    setClientId(formData.clientId);
    setClientSecret(formData.clientSecret);
    setVersion(formData.techSpecsVersion);
    setAuthOptions({
      scope: formData.authOptionsScope,
      audience: formData.authOptionsAudience,
      resource: formData.authOptionsResource,
    });

    navigate("/conformance-test-result");
  };

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      <main className="main">
        <div className="header">
          <div>
            <h2>{t("conformancetesting.title")}</h2>
            <p>{t("conformancetesting.subtitle")}</p>
          </div>
        </div>

        <Form.Root onSubmit={handleSubmit} className="form-root">
          <Form.Field name="solutionApiUrl" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.solutionApiUrl.label")}
              <span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.solutionApiUrl}
                name="solutionApiUrl"
                required
                placeholder={t(
                  "conformancetesting.form.solutionApiUrl.placeholder"
                )}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="authBaseUrl" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.authBaseUrl.label")}
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authBaseUrl}
                name="authBaseUrl"
                placeholder={t(
                  "conformancetesting.form.authBaseUrl.placeholder"
                )}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientId" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.clientId.label")}
              <span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientId}
                name="clientId"
                required
                placeholder={t("conformancetesting.form.clientId.placeholder")}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="clientSecret" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.clientSecret.label")}
              <span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.clientSecret}
                name="clientSecret"
                required
                placeholder={t(
                  "conformancetesting.form.clientSecret.placeholder"
                )}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="scope" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.scope.label")}
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsScope}
                name="authOptionsScope"
                placeholder={t("conformancetesting.form.scope.placeholder")}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="audience" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.audience.label")}
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsAudience}
                name="authOptionsAudience"
                placeholder={t("conformancetesting.form.audience.placeholder")}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="resource" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.resource.label")}
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root
                value={formData.authOptionsResource}
                name="authOptionsResource"
                placeholder={t("conformancetesting.form.resource.placeholder")}
                onChange={handleChange}
                className="input"
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="techSpecsVersion" className="form-field">
            <Form.Label className="form-label">
              {t("conformancetesting.form.techSpecsVersion.label")}
              <span className="required">*</span>
            </Form.Label>
            <Form.Control asChild>
              <select
                name="techSpecsVersion"
                onChange={handleChange}
                required
                className="select"
                defaultValue={formData.techSpecsVersion}
              >
                <option value="V2.0">
                  {t("conformancetesting.form.techSpecsVersion.v20")}
                </option>
                <option value="V2.1">
                  {t("conformancetesting.form.techSpecsVersion.v21")}
                </option>
                <option value="V2.2">
                  {t("conformancetesting.form.techSpecsVersion.v22")}
                </option>
                <option value="V2.3">
                  {t("conformancetesting.form.techSpecsVersion.v23")}
                </option>
                <option value="V3.0">
                  {t("conformancetesting.form.techSpecsVersion.v30")}
                </option>
              </select>
            </Form.Control>
          </Form.Field>

          <div className="form-actions">
            <Form.Submit asChild>
              <Button type="submit" className="submit-button">
                {t("conformancetesting.form.runTests")}
              </Button>
            </Form.Submit>
          </div>
        </Form.Root>
      </main>
      <div className="test-details-container">
        <Box className="test-box">
          <h2 className="heading">{t("conformancetesting.guidance.title")}</h2>

          <h3 className="subheading">
            {t("conformancetesting.guidance.solutionApiBaseUrl.title")}
          </h3>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.solutionApiBaseUrl.text1")}
          </p>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.solutionApiBaseUrl.text2")}
          </p>

          <h3 className="subheading">
            {t("conformancetesting.guidance.authBaseUrlOptional.title")}
          </h3>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.authBaseUrlOptional.text1")}
          </p>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.authBaseUrlOptional.text2")}
          </p>

          <h3 className="subheading">
            {t("conformancetesting.guidance.clientId.title")}
          </h3>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.clientId.text")}
          </p>

          <h3 className="subheading">
            {t("conformancetesting.guidance.clientSecret.title")}
          </h3>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.clientSecret.text")}
          </p>

          <h3 className="subheading">
            {t("conformancetesting.guidance.otherAuthOptions.title")}
          </h3>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.otherAuthOptions.text")}
          </p>

          <h3 className="subheading">
            {t("conformancetesting.guidance.techSpecsVersion.title")}
          </h3>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.techSpecsVersion.text1")}
          </p>
          <p className="paragraph-text">
            {t("conformancetesting.guidance.techSpecsVersion.text2")}
          </p>
        </Box>
      </div>
    </>
  );
};

export default ConformanceTesting;
