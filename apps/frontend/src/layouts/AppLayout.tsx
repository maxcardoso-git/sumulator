import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  rem,
} from '@mantine/core';
import {
  IconDashboard,
  IconMessage,
  IconForms,
  IconDatabase,
  IconApi,
  IconChartBar,
  IconBrain,
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconServer,
  IconTestPipe,
} from '@tabler/icons-react';
import { useAuthStore } from '../stores/auth.store';

const navItems = [
  { label: 'Dashboard', icon: IconDashboard, path: '/dashboard' },
  { label: 'Chat Simulator', icon: IconMessage, path: '/chat' },
  { label: 'Formulários', icon: IconForms, path: '/forms' },
  { label: 'Data Generator', icon: IconDatabase, path: '/data-generator' },
  { label: 'Domínio Semântico', icon: IconBrain, path: '/semantic-domain' },
  { label: 'APIs Simuladas', icon: IconApi, path: '/simulated-apis' },
  { label: 'Observabilidade', icon: IconChartBar, path: '/observability' },
  { label: 'Ambientes', icon: IconServer, path: '/environments' },
  { label: 'Cenários', icon: IconTestPipe, path: '/scenarios' },
];

export function AppLayout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={() => setOpened(!opened)} hiddenFrom="sm" size="sm" />
            <Text size="lg" fw={700} c="blue">
              Orchestrator Simulator
            </Text>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="blue" radius="xl" size="sm">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Text size="sm">{user?.name || user?.email}</Text>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Conta</Menu.Label>
              <Menu.Item leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />}>
                Configurações
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                onClick={handleLogout}
              >
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setOpened(false);
            }}
            mb={4}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
