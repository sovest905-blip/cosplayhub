from django.urls import path
from .views import (
    ConversationListView,
    MessageListView,
    UnreadMessagesCountView,
)

urlpatterns = [
    path("conversations/", ConversationListView.as_view(), name="conversations"),
    path("conversations/<int:pk>/messages/", MessageListView.as_view(), name="conversation-messages"),
    path("messages/unread-count/", UnreadMessagesCountView.as_view(), name="messages-unread"),
]
