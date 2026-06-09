"""Тесты мессенджера: создание диалога, отправка, ИЗОЛЯЦИЯ приватных ЛС (ИБ), непрочитанное."""
import pytest

from apps.messaging.models import Conversation, Message
from apps.notifications.models import Notification

CONVS = "/api/v1/conversations/"
UNREAD = "/api/v1/messages/unread-count/"


def msgs_url(conv_id):
    return f"/api/v1/conversations/{conv_id}/messages/"


@pytest.fixture
def three(make_user):
    alice = make_user(username="alice", email="alice@example.com")
    bob = make_user(username="bob", email="bob@example.com")
    eve = make_user(username="eve", email="eve@example.com")
    return alice, bob, eve


def _conv(*users):
    c = Conversation.objects.create()
    c.participants.add(*users)
    return c


# ── Создание диалога ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_start_conversation(api, three):
    alice, bob, _ = three
    api.force_authenticate(user=alice)
    resp = api.post(CONVS, {"user": bob.id})
    assert resp.status_code == 201
    conv = Conversation.objects.get()
    assert set(conv.participants.values_list("id", flat=True)) == {alice.id, bob.id}


@pytest.mark.django_db
def test_start_conversation_is_idempotent(api, three):
    alice, bob, _ = three
    api.force_authenticate(user=alice)
    api.post(CONVS, {"user": bob.id})
    api.post(CONVS, {"user": bob.id})
    # Повторный POST не плодит дубли — тот же 1-на-1 диалог.
    assert Conversation.objects.count() == 1


@pytest.mark.django_db
def test_cannot_message_self(api, three):
    alice, _, _ = three
    api.force_authenticate(user=alice)
    assert api.post(CONVS, {"user": alice.id}).status_code == 400


@pytest.mark.django_db
def test_conversation_with_unknown_user(api, three):
    alice, _, _ = three
    api.force_authenticate(user=alice)
    assert api.post(CONVS, {"user": 999999}).status_code == 404


# ── Изоляция (ИБ): чужие диалоги недоступны ──────────────────────────────────────

@pytest.mark.django_db
def test_list_shows_only_own_conversations(api, three):
    alice, bob, eve = three
    _conv(alice, bob)
    _conv(bob, eve)  # диалог без alice
    api.force_authenticate(user=alice)
    resp = api.get(CONVS)
    assert resp.status_code == 200
    assert len(resp.data) == 1


@pytest.mark.django_db
def test_cannot_read_foreign_conversation(api, three):
    """КЛЮЧЕВОЕ ИБ: участник не диалога не может прочитать переписку."""
    alice, bob, eve = three
    conv = _conv(bob, eve)
    Message.objects.create(conversation=conv, sender=bob, text="секрет")
    api.force_authenticate(user=alice)
    assert api.get(msgs_url(conv.id)).status_code == 404


@pytest.mark.django_db
def test_cannot_post_to_foreign_conversation(api, three):
    alice, bob, eve = three
    conv = _conv(bob, eve)
    api.force_authenticate(user=alice)
    assert api.post(msgs_url(conv.id), {"text": "влезаю"}).status_code == 404


# ── Отправка сообщений ───────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_send_message_notifies_peer(api, three):
    alice, bob, _ = three
    conv = _conv(alice, bob)
    api.force_authenticate(user=alice)
    resp = api.post(msgs_url(conv.id), {"text": "привет"})
    assert resp.status_code == 201
    assert Message.objects.filter(conversation=conv, sender=alice, text="привет").exists()
    assert Notification.objects.filter(recipient=bob, kind="message").exists()


@pytest.mark.django_db
def test_empty_message_rejected(api, three):
    alice, bob, _ = three
    conv = _conv(alice, bob)
    api.force_authenticate(user=alice)
    assert api.post(msgs_url(conv.id), {"text": "   "}).status_code == 400


# ── Непрочитанное ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_unread_count_and_mark_read(api, three):
    alice, bob, _ = three
    conv = _conv(alice, bob)
    Message.objects.create(conversation=conv, sender=bob, text="1")
    Message.objects.create(conversation=conv, sender=bob, text="2")

    api.force_authenticate(user=alice)
    assert api.get(UNREAD).data["count"] == 2          # два входящих непрочитанных
    api.get(msgs_url(conv.id))                          # открыли диалог → пометилось прочитанным
    assert api.get(UNREAD).data["count"] == 0


@pytest.mark.django_db
def test_own_messages_not_counted_unread(api, three):
    alice, bob, _ = three
    conv = _conv(alice, bob)
    Message.objects.create(conversation=conv, sender=alice, text="моё")
    api.force_authenticate(user=alice)
    assert api.get(UNREAD).data["count"] == 0  # свои сообщения не считаются непрочитанными
