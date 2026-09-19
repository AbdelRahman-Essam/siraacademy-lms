import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0004_course_thumbnail_promo_video_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='discount_percent',
            field=models.PositiveIntegerField(
                default=0,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
                help_text="Percentage off the price shown/charged to students (0–100). "
                          "0 means no discount.",
            ),
        ),
    ]
