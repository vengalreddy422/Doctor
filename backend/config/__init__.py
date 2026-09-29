"""
Compatibility fixes for Python 3.14+ object copying semantics with Django BaseContext.
In Python 3.14, copy.copy(super()) returns a super proxy instead of a copied instance,
causing an AttributeError on template rendering. This patch fixes BaseContext.__copy__.
"""
import copy
from django.template import context


def _patched_base_context_copy(self):
    obj = self.__class__.__new__(self.__class__)
    obj.__dict__.update(self.__dict__)
    obj.dicts = self.dicts[:]
    return obj


context.BaseContext.__copy__ = _patched_base_context_copy
