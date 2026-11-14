"""Test provisioning guards without connecting to or changing PostgreSQL."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from setup_existing import provision, validate_name


class ProvisioningTests(unittest.TestCase):
    def test_unsafe_names_are_rejected(self):
        for value in ('name\nPASSWORD=x', 'x; DROP DATABASE other', '', 'x' * 64):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_name(value)

    def test_existing_configuration_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            env = Path(directory) / '.env'
            env.write_text('existing', encoding='utf-8')
            connection = Mock()
            with self.assertRaises(ValueError):
                provision(connection, 'bims_dev', 5432, env)
            connection.execute.assert_not_called()
            self.assertEqual(env.read_text(), 'existing')

    def test_role_collision_does_not_write_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            env = Path(directory) / '.env'
            connection = Mock()
            connection.execute.return_value.fetchone.return_value = (1,)
            with self.assertRaises(ValueError):
                provision(connection, 'bims_dev', 5432, env)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_success_writes_configuration_without_admin_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            env = Path(directory) / '.env'
            connection = Mock()
            connection.execute.return_value.fetchone.return_value = None
            provision(connection, 'bims_dev', 5432, env)
            self.assertIn('POSTGRES_USER=bims_dev\n', env.read_text())
            self.assertFalse(env.with_name('.env.pending').exists())
            self.assertEqual(connection.execute.call_count, 4)

    def test_partial_failure_preserves_recovery_file(self):
        with tempfile.TemporaryDirectory() as directory:
            env = Path(directory) / '.env'
            connection = Mock()
            empty = Mock()
            empty.fetchone.return_value = None
            connection.execute.side_effect = [empty, empty, RuntimeError('creation failed')]
            with self.assertRaises(RuntimeError):
                provision(connection, 'bims_dev', 5432, env)
            self.assertFalse(env.exists())
            self.assertTrue(env.with_name('.env.pending').exists())


if __name__ == '__main__':
    unittest.main()
