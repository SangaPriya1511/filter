"""General Filter Endpoints and Methods for Evaluation."""


__copyright__ = """
@copyright (c) 2022 by Robert Bosch GmbH. All rights reserved.

The reproduction, distribution and utilization of this file as
well as the communication of its contents to others without express
authorization is prohibited. Offenders will be held liable for the
payment of damages and can be prosecuted. All rights reserved
particularly in the event of the grant of a patent, utility model
or design.
"""
from django.utils.safestring import mark_safe
from dlv_web.utils.decorators import authentication_required

from django_filters.rest_framework import DjangoFilterBackend
from dlv_web.models.evaluation.common.evaluation import Evaluation
from dlv_web.models.evaluation.evaluation_job import EvaluationJob
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


def get_filter_fields(model):
    """Get all possible filter fields for the given model."""

    filter_fields = {}
    not_usable_fields = ["ArrayField", "JSONField", "ManyToManyField", "ForeignKey"]
    default_verbs = ["exact", "contains", "startswith", "in"]

    for field in model._meta.get_fields():
        if field.get_internal_type() not in not_usable_fields:
            filter_fields[field.name] = default_verbs

    return filter_fields


@authentication_required
class FilterFields(APIView):
    def get(self, request, model, format=None):
        """Get all possible filter fields for the given model."""
        if self.kwargs.get("model") == "EvaluationJob":
            self.model = EvaluationJob
        elif self.kwargs.get("model") == "Evaluation":
            self.model = Evaluation

        filter_fields = []
        not_usable_fields = ["ArrayField", "JSONField", "ManyToManyField"]
        for field in self.model._meta.get_fields():
            if field.get_internal_type() not in not_usable_fields:
                filter_fields.append(field.name)

        filter_fields.append("tags__name")

        return Response(filter_fields, status=status.HTTP_200_OK)


@authentication_required
class FilterFieldsOptions(APIView):
    filter_backends = [DjangoFilterBackend]
    filter_fields = get_filter_fields(EvaluationJob)
    pagination_class = None

    def filter_queryset(self, queryset):
        """
        Given a queryset, filter it with whichever filter backend is in use.
        You are unlikely to want to override this method, although you may need
        to call it either from a list view, or from a custom `get_object`
        method if you want to apply the configured filtering backend to the
        default queryset.
        """
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    @staticmethod
    def get_options(param, q):
        options = []
        for value in q.values_list(param, flat=True).distinct():
            safe_value = str(mark_safe(value))
            options.append(safe_value)

        return options

    def get(self, request, model):
        # set model
        if self.kwargs.get("model") == "EvaluationJob":
            self.model = EvaluationJob
        elif self.kwargs.get("model") == "Evaluation":
            self.model = Evaluation

        self.filter_fields = get_filter_fields(self.model)

        # set queryset
        queryset = self.model.objects.all()
        queryset = self.filter_queryset(queryset)
        requested_field = request.GET.get("requested_field", None)
        search_query = request.GET.get("search_query", None)

        if requested_field:

            if search_query:
                filter_option = requested_field + "__icontains"
                queryset = queryset.filter(**{filter_option: search_query})
                
            data = {}
            data[requested_field] = self.get_options(requested_field, queryset)
            return Response(data)
        else:
            return Response({"message": "no requested_field provided"}, status=status.HTTP_400_BAD_REQUEST)


@authentication_required
class EvaluationOverviewFilterOptions(APIView):
    queryset = Evaluation.objects.all()
    filter_backends = [DjangoFilterBackend]
    filter_fields = get_filter_fields(Evaluation)
    pagination_class = None

    def filter_queryset(self, queryset):
        """
        Given a queryset, filter it with whichever filter backend is in use.
        You are unlikely to want to override this method, although you may need
        to call it either from a list view, or from a custom `get_object`
        method if you want to apply the configured filtering backend to the
        default queryset.
        """
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    @staticmethod
    def get_options(param, q):
        options = []
        for value in q.values_list(param, flat=True).distinct():
            safe_value = str(mark_safe(value))
            options.append(safe_value)

        return options

    def get(self, request):
        queryset = self.filter_queryset(Evaluation.objects.all())
        requested_field = request.GET.get("requested_field", None)
        search_query = request.GET.get("search_query", None)

        if requested_field:

            if search_query:
                filter_option = requested_field + "__icontains"
                queryset = queryset.filter(**{filter_option: search_query})
            data = {}
            data[requested_field] = self.get_options(requested_field, queryset)
            return Response(data)
        else:
            return Response({"message": "no requested_field provided"}, status=status.HTTP_400_BAD_REQUEST)
