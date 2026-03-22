import { Routes, Route } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { HomePage } from './components/pages/HomePage';
import { FilePage } from './components/pages/FilePage';
import { SearchPage } from './components/pages/SearchPage';
import { OrgChartPage } from './components/pages/OrgChartPage';
import { IntakePage } from './components/pages/IntakePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="file/:slug" element={<FilePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="org-chart" element={<OrgChartPage />} />
        <Route path="intake" element={<IntakePage />} />
      </Route>
    </Routes>
  );
}
