import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { RequireAuth } from './components/layout/RequireAuth';
import { LoginPage } from './components/pages/LoginPage';
import { HomePage } from './components/pages/HomePage';
import { FilePage } from './components/pages/FilePage';
import { SearchPage } from './components/pages/SearchPage';
import { OrgChartPage } from './components/pages/OrgChartPage';
import { IntakePage } from './components/pages/IntakePage';
import { TimelinePage } from './components/pages/TimelinePage';
import { AttachmentsPage } from './components/pages/AttachmentsPage';
import { ApprovalsPage } from './components/pages/ApprovalsPage';
import { DirectoryPage } from './components/pages/DirectoryPage';
import { ProjectsPage } from './components/pages/ProjectsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="file/*" element={<FilePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="org-chart" element={<OrgChartPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="intake" element={<IntakePage />} />
        <Route path="attachments" element={<AttachmentsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="directory" element={<DirectoryPage />} />
        <Route path="projects" element={<ProjectsPage />} />
      </Route>
    </Routes>
  );
}
