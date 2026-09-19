from django.core.exceptions import ValidationError


def validate_file_size(max_mb):
    """Returns a validator rejecting files over max_mb megabytes.
    Without this, nothing stops someone from filling the disk with a
    single huge upload."""
    def validator(file):
        limit = max_mb * 1024 * 1024
        if file.size > limit:
            raise ValidationError(f"File too large — max size is {max_mb}MB.")
    return validator
